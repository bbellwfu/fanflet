import { createClient } from "@/lib/supabase/server";
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
    .select("*")
    .eq("fanflet_id", id)
    .order("display_order", { ascending: true });

  // Fetch speaker's survey questions for the selector
  const { data: surveyQuestions } = await supabase
    .from("survey_questions")
    .select("id, question_text, question_type")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: true });

  // Fetch speaker's resource library for the "Add from Library" flow
  const { data: libraryItems } = await supabase
    .from("resource_library")
    .select("id, type, title, description, url, file_path, image_url, section_name, metadata")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: true });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";
  const publicUrl =
    fanflet.status === "published" && speaker.slug
      ? `${baseUrl}/${speaker.slug}/${fanflet.slug}`
      : null;

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
    />
  );
}
