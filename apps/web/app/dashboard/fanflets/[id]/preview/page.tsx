import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { SurveyPrompt } from "@/components/landing/survey-prompt";
import type { SurveyQuestion } from "@/components/landing/survey-prompt";
import { getThemeCSSVariables, resolveThemeId } from "@/lib/themes";
import Link from "next/link";

export default async function FanfletPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify the speaker owns this fanflet
  const { data: speaker } = await supabase
    .from("speakers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/dashboard/settings");
  }

  // Fetch fanflet WITHOUT filtering by status — this is the key difference from the public route
  const { data: fanflet } = await supabase
    .from("fanflets")
    .select("*")
    .eq("id", id)
    .eq("speaker_id", speaker.id)
    .single();

  if (!fanflet) {
    notFound();
  }

  // Fetch resource blocks with library joins (same logic as public page)
  const { data: rawBlocks } = await supabase
    .from("resource_blocks")
    .select("*, resource_library(*)")
    .eq("fanflet_id", fanflet.id)
    .order("display_order", { ascending: true });

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
        resource_library: undefined,
      };
    }
    return { ...block, resource_library: undefined };
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

  let previewSurveyQuestions: SurveyQuestion[] = [];
  if (surveyIds.length > 0) {
    const { data } = await supabase
      .from("survey_questions")
      .select("id, question_text, question_type")
      .in("id", surveyIds);
    if (data) {
      const byId = new Map(data.map((q) => [q.id, q]));
      previewSurveyQuestions = surveyIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((q) => ({
          id: q!.id,
          text: q!.question_text,
          type: q!.question_type as "nps" | "yes_no" | "rating",
        }));
    }
  }

  const fanfletWithBlocks = {
    ...fanflet,
    resource_blocks: resourceBlocks,
  };

  const themeId = resolveThemeId(fanflet.theme_config as Record<string, unknown> | null);
  const themeVars = getThemeCSSVariables(themeId);

  return (
    <div className="min-h-screen bg-slate-100" style={themeVars}>
      {/* Preview banner */}
      <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium sticky top-0 z-50">
        Preview Mode — This is how your Fanflet will appear to your audience.{" "}
        <Link
          href={`/dashboard/fanflets/${id}`}
          className="underline font-semibold hover:text-white/90"
        >
          Back to Editor
        </Link>
      </div>

      {/* No AnalyticsScript — preview visits are not tracked */}
      {previewSurveyQuestions.length > 0 && (
        <SurveyPrompt
          fanfletId={fanflet.id}
          questions={previewSurveyQuestions}
        />
      )}
      <LandingPage
        speaker={speaker}
        fanflet={fanfletWithBlocks}
        subscriberCount={subscriberCount ?? 0}
        speakerSlug={speaker.slug ?? ""}
        fanfletSlug={fanflet.slug ?? ""}
      />
    </div>
  );
}
