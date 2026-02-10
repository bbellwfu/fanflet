import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuestionLibrary } from "@/components/dashboard/question-library";

export default async function SurveysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/dashboard/settings");
  }

  const { data: surveyQuestions } = await supabase
    .from("survey_questions")
    .select("id, question_text, question_type, is_default, created_at")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
          Survey Questions
        </h1>
        <p className="text-muted-foreground mt-1">
          Create reusable feedback questions to attach to your Fanflets.
        </p>
      </div>

      <QuestionLibrary questions={surveyQuestions ?? []} />
    </div>
  );
}
