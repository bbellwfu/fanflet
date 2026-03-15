import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { ExpiredFanfletPage } from "@/components/landing/expired-fanflet-page";
import { AnalyticsScript } from "@/components/landing/analytics-script";
import { SurveyGatedLanding } from "@/components/landing/survey-gated-landing";
import { getThemeCSSVariables, resolveThemeId } from "@/lib/themes";
import { isExpired } from "@/lib/expiration";

export const revalidate = 3600; // Cache for 1 hour

type Props = {
  params: Promise<{ speakerSlug: string; fanfletSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { speakerSlug, fanfletSlug } = await params;
  const supabase = await createClient();

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name")
    .eq("slug", speakerSlug)
    .single();

  if (!speaker) {
    return { title: "Fanflet Not Found" };
  }

  const { data: fanflet, error: fanfletErr } = await supabase
    .from("fanflets")
    .select("title, event_name, event_date, expiration_date")
    .eq("speaker_id", speaker.id)
    .eq("slug", fanfletSlug)
    .eq("status", "published")
    .single();

  let resolvedFanflet = fanflet;
  if (fanfletErr && (fanfletErr.code === "42703" || fanfletErr.code === "PGRST204" || fanfletErr.message?.includes("schema cache"))) {
    const { data: fallback } = await supabase
      .from("fanflets")
      .select("title, event_name, event_date")
      .eq("speaker_id", speaker.id)
      .eq("slug", fanfletSlug)
      .eq("status", "published")
      .single();
    resolvedFanflet = fallback ? { ...fallback, expiration_date: null } : null;
  }

  if (!resolvedFanflet) {
    return { title: "Fanflet Not Found" };
  }

  const expired = isExpired(resolvedFanflet.expiration_date ?? null);

  if (expired) {
    return {
      title: "Content No Longer Available | Fanflet",
      description: `This Fanflet from ${speaker.name} is no longer available.`,
      robots: { index: false, follow: true },
    };
  }

  const eventContext = resolvedFanflet.event_name
    ? `${resolvedFanflet.event_name}${resolvedFanflet.event_date ? ` · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(resolvedFanflet.event_date + "T12:00:00Z"))}` : ""}`
    : "Presentation resources";

  return {
    title: `${resolvedFanflet.title} | ${speaker.name}`,
    description: `${resolvedFanflet.title} by ${speaker.name}. ${eventContext}.`,
    // Allow search engines to index speaker pages for discoverability,
    // but block AI training crawlers from using speaker content.
    // These per-page meta tags complement the site-level robots.txt
    // and the X-Robots-Tag header set in middleware.
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
    },
    other: {
      // AI training opt-out meta tags (noai/noimageai proposed standard)
      robots: "noai, noimageai",
    },
  };
}

export default async function AudienceLandingPage({ params }: Props) {
  const { speakerSlug, fanfletSlug } = await params;
  const supabase = await createClient();

  const { data: speaker } = await supabase
    .from("speakers")
    .select("*")
    .eq("slug", speakerSlug)
    .single();

  if (!speaker) notFound();

  const { data: fanflet } = await supabase
    .from("fanflets")
    .select("*")
    .eq("speaker_id", speaker.id)
    .eq("slug", fanfletSlug)
    .eq("status", "published")
    .single();

  if (!fanflet) notFound();

  const expired = isExpired(fanflet.expiration_date ?? null);
  if (expired) {
    return (
      <ExpiredFanfletPage
        speaker={{
          id: speaker.id,
          name: speaker.name,
          photo_url: speaker.photo_url,
          social_links: speaker.social_links,
        }}
      />
    );
  }

  const { data: rawBlocks } = await supabase
    .from("resource_blocks")
    .select("*, resource_library(*)")
    .eq("fanflet_id", fanflet.id)
    .order("display_order", { ascending: true });

  const sponsorLibraryIds = (rawBlocks ?? [])
    .map((b) => (b as { sponsor_library_item_id?: string | null }).sponsor_library_item_id)
    .filter((id): id is string => !!id);
  const sponsorLibraryMap: Map<string, { title?: string; description?: string | null; url?: string | null; file_path?: string | null; image_url?: string | null; file_size_bytes?: number | null; file_type?: string | null; type?: string }> = new Map();
  if (sponsorLibraryIds.length > 0) {
    const { data: sponsorLibRows } = await supabase
      .from("sponsor_resource_library")
      .select("id, title, description, url, file_path, image_url, file_size_bytes, file_type, type")
      .in("id", sponsorLibraryIds);
    for (const row of sponsorLibRows ?? []) {
      sponsorLibraryMap.set(row.id, row);
    }
  }

  // For dynamic blocks (library_item_id or sponsor_library_item_id), merge library data over block
  const resourceBlocks = (rawBlocks ?? []).map((block) => {
    const raw = block as Record<string, unknown> & { library_item_id?: string | null; sponsor_library_item_id?: string | null };
    const rawLib = block.resource_library;
    const lib = (Array.isArray(rawLib) ? rawLib[0] : rawLib) as {
      title?: string;
      description?: string | null;
      url?: string | null;
      file_path?: string | null;
      image_url?: string | null;
      metadata?: Record<string, unknown> | null;
      type?: string;
      file_size_bytes?: number | null;
      file_type?: string | null;
    } | null;
    const sponsorLib = raw.sponsor_library_item_id ? sponsorLibraryMap.get(raw.sponsor_library_item_id as string) : null;

    if (sponsorLib && raw.sponsor_library_item_id) {
      return {
        ...block,
        title: block.title || sponsorLib.title,
        description: block.description || sponsorLib.description,
        url: block.url || sponsorLib.url,
        file_path: block.file_path || sponsorLib.file_path,
        image_url: block.image_url || sponsorLib.image_url,
        type: block.type || sponsorLib.type || "link",
        file_size_bytes: sponsorLib.file_size_bytes ?? null,
        file_type: sponsorLib.file_type ?? null,
        sponsor_library_item_id: raw.sponsor_library_item_id,
        resource_library: undefined,
      };
    }
    if (lib && block.library_item_id) {
      return {
        ...block,
        title: block.title || lib.title,
        description: block.description || lib.description,
        url: block.url || lib.url,
        file_path: block.file_path || lib.file_path,
        image_url: block.image_url || lib.image_url,
        metadata: { ...(lib.metadata ?? {}), ...(block.metadata ?? {}) },
        type: block.type || lib.type || "link",
        file_size_bytes: lib.file_size_bytes ?? null,
        file_type: lib.file_type ?? null,
        resource_library: undefined,
      };
    }
    return {
      ...block,
      file_size_bytes: (lib?.file_size_bytes as number | null) ?? null,
      file_type: (lib?.file_type as string | null) ?? null,
      resource_library: undefined,
    };
  });

  const { count: subscriberCount } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true })
    .eq("speaker_id", speaker.id);

  // Fetch survey questions (prefer array, fall back to legacy single column)
  const surveyIds: string[] =
    (fanflet.survey_question_ids as string[] | undefined)?.length
      ? (fanflet.survey_question_ids as string[])
      : fanflet.survey_question_id
        ? [fanflet.survey_question_id]
        : [];

  let surveyQuestions: { id: string; text: string; type: "nps" | "yes_no" | "rating" }[] = [];
  if (surveyIds.length > 0) {
    const { data } = await supabase
      .from("survey_questions")
      .select("id, question_text, question_type")
      .in("id", surveyIds);
    if (data) {
      const byId = new Map(data.map((q) => [q.id, q]));
      surveyQuestions = surveyIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((q) => ({
          id: q!.id,
          text: q!.question_text,
          type: q!.question_type as "nps" | "yes_no" | "rating",
        }));
    }
  }

  // SMS Bookmark is feature-flagged (requires Twilio setup)
  const { data: smsFlag } = await supabase
    .from("feature_flags")
    .select("is_global")
    .eq("key", "sms_bookmark")
    .maybeSingle();
  const showSmsBookmark = smsFlag?.is_global === true;

  const { count: explicitSponsorCount } = await supabase
    .from("fanflet_sponsors")
    .select("*", { count: "exact", head: true })
    .eq("fanflet_id", fanflet.id);

  const { count: activeSponsorConnectionCount } = await supabase
    .from("sponsor_connections")
    .select("*", { count: "exact", head: true })
    .eq("speaker_id", speaker.id)
    .eq("status", "active")
    .is("ended_at", null);

  const fanfletWithBlocks = {
    ...fanflet,
    resource_blocks: resourceBlocks,
    has_explicit_sponsors: (explicitSponsorCount ?? 0) > 0,
    has_active_sponsor_connections: (activeSponsorConnectionCount ?? 0) > 0,
  };

  const themeId = resolveThemeId(fanflet.theme_config as Record<string, unknown> | null);
  const themeVars = getThemeCSSVariables(themeId);

  return (
    <div style={themeVars}>
      <AnalyticsScript fanfletId={fanflet.id} />
      {surveyQuestions.length > 0 ? (
        <SurveyGatedLanding
          speaker={speaker}
          fanflet={fanfletWithBlocks}
          subscriberCount={subscriberCount ?? 0}
          showSmsBookmark={showSmsBookmark}
          speakerSlug={speakerSlug}
          fanfletSlug={fanfletSlug}
          surveyQuestions={surveyQuestions}
        />
      ) : (
        <LandingPage
          speaker={speaker}
          fanflet={fanfletWithBlocks}
          subscriberCount={subscriberCount ?? 0}
          showSmsBookmark={showSmsBookmark}
          speakerSlug={speakerSlug}
          fanfletSlug={fanfletSlug}
        />
      )}
    </div>
  );
}
