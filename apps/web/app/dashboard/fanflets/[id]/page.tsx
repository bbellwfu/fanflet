import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/config";
import { getSpeakerEntitlements } from "@fanflet/db";
import { redirect, notFound } from "next/navigation";
import { FanfletEditor } from "@/components/fanflet-builder/fanflet-editor";

export default async function FanfletEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, slug")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/dashboard/settings");
  }

  const { data: fanflet } = await supabase
    .from("fanflets")
    .select("*")
    .eq("id", id)
    .eq("speaker_id", speaker.id)
    .single();

  if (!fanflet) {
    notFound();
  }

  const { data: resourceBlocks } = await supabase
    .from("resource_blocks")
    .select("*, resource_library(file_path, file_type, file_size_bytes)")
    .eq("fanflet_id", id)
    .order("display_order", { ascending: true });

  const [activeConnectionsResult, endedConnectionsResult] = await Promise.all([
    supabase
      .from("sponsor_connections")
      .select("sponsor_id, sponsor_accounts(id, company_name)")
      .eq("speaker_id", speaker.id)
      .eq("status", "active")
      .is("ended_at", null),
    supabase
      .from("sponsor_connections")
      .select("sponsor_id, ended_at, sponsor_accounts(id, company_name)")
      .eq("speaker_id", speaker.id)
      .eq("status", "active")
      .not("ended_at", "is", null),
  ]);

  const connectedSponsors = (activeConnectionsResult.data ?? [])
    .map((c) => {
      const row = c as Record<string, unknown>;
      const acc = row.sponsor_accounts as { id: string; company_name: string } | { id: string; company_name: string }[] | null;
      return Array.isArray(acc) ? acc[0] ?? null : acc;
    })
    .filter(Boolean) as { id: string; company_name: string }[];
  const uniqueSponsors = Array.from(
    new Map(connectedSponsors.map((s) => [s.id, s])).values()
  );

  const endedSponsors = (endedConnectionsResult.data ?? [])
    .map((c) => {
      const row = c as Record<string, unknown>;
      const acc = row.sponsor_accounts as { id: string; company_name: string } | { id: string; company_name: string }[] | null;
      const sponsor = Array.isArray(acc) ? acc[0] : acc;
      const endedAt = row.ended_at as string | null;
      return sponsor && endedAt ? { id: sponsor.id, company_name: sponsor.company_name, ended_at: endedAt } : null;
    })
    .filter(Boolean) as { id: string; company_name: string; ended_at: string }[];

  // Fetch speaker's survey questions for the selector
  const { data: surveyQuestions } = await supabase
    .from("survey_questions")
    .select("id, question_text, question_type")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: true });

  // Fetch speaker's resource library for the "Add from Library" flow
  const { data: libraryItems } = await supabase
    .from("resource_library")
    .select("id, type, title, description, url, file_path, file_type, file_size_bytes, image_url, section_name, metadata")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: true });

  // Sponsor catalog: library items from connected sponsors (RLS filters by availability)
  const connectedSponsorIds = uniqueSponsors.map((s) => s.id);
  const { data: sponsorCatalogItems } =
    connectedSponsorIds.length > 0
      ? await supabase
          .from("sponsor_resource_library")
          .select("id, sponsor_id, type, title, description, url, file_type, file_size_bytes, image_url")
          .in("sponsor_id", connectedSponsorIds)
          .eq("status", "available")
          .order("created_at", { ascending: false })
      : { data: [] };

  const baseUrl = getSiteUrl();
  const publicUrl =
    fanflet.status === "published" && speaker.slug
      ? `${baseUrl}/${speaker.slug}/${fanflet.slug}`
      : null;

  const entitlements = await getSpeakerEntitlements(speaker.id);
  const allowMultipleThemes = entitlements.features.has("multiple_theme_colors");
  const hasSurveys = entitlements.features.has("surveys_session_feedback");
  const allowCustomExpiration = entitlements.features.has("custom_expiration");
  const allowSponsorVisibility = entitlements.features.has("sponsor_visibility");
  const hasSponsorReports = entitlements.features.has("sponsor_reports");

  return (
    <FanfletEditor
      fanflet={fanflet}
      resourceBlocks={resourceBlocks ?? []}
      speakerSlug={speaker.slug}
      publicUrl={publicUrl}
      hasSpeakerSlug={!!speaker.slug}
      authUserId={user.id}
      surveyQuestions={surveyQuestions ?? []}
      libraryItems={libraryItems ?? []}
      sponsorCatalogItems={(sponsorCatalogItems ?? []).map((r) => ({
        id: r.id,
        sponsor_id: r.sponsor_id,
        type: r.type,
        title: r.title,
        description: r.description ?? null,
        url: r.url ?? null,
        file_type: r.file_type ?? null,
        file_size_bytes: r.file_size_bytes ?? null,
        image_url: r.image_url ?? null,
      }))}
      allowMultipleThemes={allowMultipleThemes}
      hasSurveys={hasSurveys}
      allowCustomExpiration={allowCustomExpiration}
      allowSponsorVisibility={allowSponsorVisibility}
      hasSponsorReports={hasSponsorReports}
      connectedSponsors={uniqueSponsors}
      endedSponsors={endedSponsors}
    />
  );
}
