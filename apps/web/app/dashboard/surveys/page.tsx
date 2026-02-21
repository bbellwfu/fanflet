import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@fanflet/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QuestionLibrary } from "@/components/dashboard/question-library";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const hasSurveys = await hasFeature(speaker.id, "surveys_session_feedback");

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

      {!hasSurveys && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-slate-700">
              Upgrade your plan to create survey questions and collect session feedback.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 border-[#1B365D] text-[#1B365D] hover:bg-[#1B365D]/5">
              <Link href="/dashboard/settings#subscription">View plans and upgrade</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <QuestionLibrary questions={surveyQuestions ?? []} allowCreate={hasSurveys} />
    </div>
  );
}
