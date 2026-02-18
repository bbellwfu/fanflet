import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { ExpiredFanfletPage } from "@/components/landing/expired-fanflet-page";
import { AnalyticsScript } from "@/components/landing/analytics-script";
import { SurveyPrompt } from "@/components/landing/survey-prompt";
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
    ? `${resolvedFanflet.event_name}${resolvedFanflet.event_date ? ` · ${new Date(resolvedFanflet.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}`
    : "Presentation resources";

  return {
    title: `${resolvedFanflet.title} | ${speaker.name}`,
    description: `${resolvedFanflet.title} by ${speaker.name}. ${eventContext}.`,
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

  // For dynamic blocks (library_item_id set), merge library item data over block data
  const resourceBlocks = (rawBlocks ?? []).map((block) => {
    const lib = block.resource_library;
    if (lib && block.library_item_id) {
      return {
        ...block,
        title: lib.title ?? block.title,
        description: lib.description ?? block.description,
        url: lib.url ?? block.url,
        file_path: lib.file_path ?? block.file_path,
        image_url: lib.image_url ?? block.image_url,
        metadata: lib.metadata ?? block.metadata,
        type: lib.type ?? block.type,
        // Keep block's own section_name and display_order
        resource_library: undefined,
      };
    }
    return { ...block, resource_library: undefined };
  });

  const { count: subscriberCount } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true })
    .eq("speaker_id", speaker.id);

  // Fetch survey question if the fanflet has one configured
  let surveyQuestion: { id: string; question_text: string; question_type: string } | null = null;
  if (fanflet.survey_question_id) {
    const { data } = await supabase
      .from("survey_questions")
      .select("id, question_text, question_type")
      .eq("id", fanflet.survey_question_id)
      .single();
    surveyQuestion = data;
  }

  const fanfletWithBlocks = {
    ...fanflet,
    resource_blocks: resourceBlocks,
  };

  const themeId = resolveThemeId(fanflet.theme_config as Record<string, unknown> | null);
  const themeVars = getThemeCSSVariables(themeId);

  return (
    <div style={themeVars}>
      <AnalyticsScript fanfletId={fanflet.id} />
      {surveyQuestion && (
        <SurveyPrompt
          fanfletId={fanflet.id}
          questionId={surveyQuestion.id}
          questionText={surveyQuestion.question_text}
          questionType={surveyQuestion.question_type as "nps" | "yes_no" | "rating"}
        />
      )}
      <LandingPage
        speaker={speaker}
        fanflet={fanfletWithBlocks}
        subscriberCount={subscriberCount ?? 0}
      />
    </div>
  );
}
