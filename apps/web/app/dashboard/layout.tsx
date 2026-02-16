import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  let fanfletCount = 0;
  let publishedFanfletCount = 0;
  let surveyQuestionCount = 0;
  let resourceLibraryCount = 0;
  if (speaker?.id) {
    const { count: totalCount } = await supabase
      .from("fanflets")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    fanfletCount = totalCount ?? 0;

    const { count: publishedCount } = await supabase
      .from("fanflets")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id)
      .eq("status", "published");
    publishedFanfletCount = publishedCount ?? 0;

    const { count: surveyCount } = await supabase
      .from("survey_questions")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    surveyQuestionCount = surveyCount ?? 0;

    const { count: resourceCount } = await supabase
      .from("resource_library")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    resourceLibraryCount = resourceCount ?? 0;
  }

  return (
    <Sidebar
      user={user}
      speaker={speaker}
      fanfletCount={fanfletCount}
      publishedFanfletCount={publishedFanfletCount}
      surveyQuestionCount={surveyQuestionCount}
      resourceLibraryCount={resourceLibraryCount}
    >
      {children}
    </Sidebar>
  );
}
