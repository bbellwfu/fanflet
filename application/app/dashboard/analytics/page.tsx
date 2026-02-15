import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Eye, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { ResourceClickBreakdown } from "@/components/analytics/resource-click-breakdown";
import { SurveyResults, type SurveyResultData } from "@/components/analytics/survey-results";

export const metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/dashboard/settings");

  // Get all fanflets for this speaker
  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id, title, event_name, slug, status")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: false });

  const fanfletIds = (fanflets || []).map((f) => f.id);

  // Get aggregate stats
  let totalViews = 0;
  let totalClicks = 0;
  let totalSignups = 0;
  let totalSubscribers = 0;

  if (fanfletIds.length > 0) {
    const { count: views } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .in("fanflet_id", fanfletIds)
      .eq("event_type", "page_view");
    totalViews = views || 0;

    const { count: clicks } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .in("fanflet_id", fanfletIds)
      .eq("event_type", "resource_click");
    totalClicks = clicks || 0;

    const { count: signups } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .in("fanflet_id", fanfletIds)
      .eq("event_type", "email_signup");
    totalSignups = signups || 0;

    const { count: subs } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    totalSubscribers = subs || 0;
  }

  // Per-fanflet analytics
  const fanfletStats = await Promise.all(
    (fanflets || []).map(async (f) => {
      const { count: views } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("fanflet_id", f.id)
        .eq("event_type", "page_view");

      const { count: clicks } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("fanflet_id", f.id)
        .eq("event_type", "resource_click");

      const { count: subs } = await supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("source_fanflet_id", f.id);

      return {
        ...f,
        views: views || 0,
        clicks: clicks || 0,
        subscribers: subs || 0,
      };
    })
  );

  // Per-resource click breakdown (only for fanflets with clicks)
  type ResourceClickStat = {
    fanflet_id: string;
    fanflet_title: string;
    resource_block_id: string;
    resource_title: string;
    resource_type: string;
    clicks: number;
  };

  let resourceClickStats: ResourceClickStat[] = [];

  if (fanfletIds.length > 0) {
    // Get all resource blocks for the speaker's fanflets
    const { data: resourceBlocks } = await supabase
      .from("resource_blocks")
      .select("id, fanflet_id, title, type")
      .in("fanflet_id", fanfletIds);

    if (resourceBlocks && resourceBlocks.length > 0) {
      // Get all resource_click events with resource_block_id
      const { data: clickEvents } = await supabase
        .from("analytics_events")
        .select("resource_block_id")
        .in("fanflet_id", fanfletIds)
        .eq("event_type", "resource_click")
        .not("resource_block_id", "is", null);

      // Count clicks per resource_block_id
      const clickCounts: Record<string, number> = {};
      (clickEvents || []).forEach((evt) => {
        const rbId = evt.resource_block_id as string;
        clickCounts[rbId] = (clickCounts[rbId] || 0) + 1;
      });

      // Map fanflet IDs to titles
      const fanfletTitleMap: Record<string, string> = {};
      (fanflets || []).forEach((f) => {
        fanfletTitleMap[f.id] = f.title;
      });

      // Build stats for resources that have at least 1 click
      resourceClickStats = resourceBlocks
        .filter((rb) => clickCounts[rb.id] > 0)
        .map((rb) => ({
          fanflet_id: rb.fanflet_id,
          fanflet_title: fanfletTitleMap[rb.fanflet_id] || "Unknown",
          resource_block_id: rb.id,
          resource_title: rb.title || "Untitled",
          resource_type: rb.type,
          clicks: clickCounts[rb.id],
        }))
        .sort((a, b) => b.clicks - a.clicks);
    }
  }

  // Fetch survey responses grouped by fanflet+question
  let surveyResultsData: SurveyResultData[] = [];
  if (fanfletIds.length > 0) {
    // Get fanflets that have a survey_question_id set
    const { data: fanfletsWithSurvey } = await supabase
      .from("fanflets")
      .select("id, title, survey_question_id")
      .in("id", fanfletIds)
      .not("survey_question_id", "is", null);

    if (fanfletsWithSurvey && fanfletsWithSurvey.length > 0) {
      const questionIds = [
        ...new Set(fanfletsWithSurvey.map((f) => f.survey_question_id as string)),
      ];
      const { data: questions } = await supabase
        .from("survey_questions")
        .select("id, question_text, question_type")
        .in("id", questionIds);

      const questionMap: Record<string, { question_text: string; question_type: string }> = {};
      (questions || []).forEach((q) => {
        questionMap[q.id] = { question_text: q.question_text, question_type: q.question_type };
      });

      // Get all survey responses for these fanflets
      const surveyFanfletIds = fanfletsWithSurvey.map((f) => f.id);
      const { data: responses } = await supabase
        .from("survey_responses")
        .select("fanflet_id, question_id, response_value")
        .in("fanflet_id", surveyFanfletIds);

      // Group responses by fanflet_id + question_id
      const grouped: Record<string, string[]> = {};
      (responses || []).forEach((r) => {
        const key = `${r.fanflet_id}|${r.question_id}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r.response_value);
      });

      surveyResultsData = fanfletsWithSurvey
        .filter((f) => f.survey_question_id && questionMap[f.survey_question_id])
        .map((f) => {
          const qId = f.survey_question_id as string;
          const key = `${f.id}|${qId}`;
          return {
            fanflet_id: f.id,
            fanflet_title: f.title,
            question_id: qId,
            question_text: questionMap[qId].question_text,
            question_type: questionMap[qId].question_type,
            responses: grouped[key] || [],
          };
        });
    }
  }

  if (!fanflets || fanflets.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-muted-foreground">Track engagement across your Fanflets.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No data yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create and publish a Fanflet, then share it at your next event to start seeing analytics here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-muted-foreground">Track engagement across all your Fanflets.</p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="h-full">
          <CardHeader className="flex min-h-16 flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex min-h-16 flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">Resource Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex min-h-16 flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">Email Signups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignups.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex min-h-16 flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Fanflet Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Fanflet Performance</CardTitle>
          <CardDescription>Engagement breakdown by Fanflet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fanfletStats.map((f) => (
              <div
                key={f.id}
                className="grid gap-3 rounded-lg border bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/fanflets/${f.id}`}
                    className="font-medium text-sm truncate block text-[#1B365D] hover:underline"
                  >
                    {f.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{f.event_name}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground md:gap-6 md:justify-items-center">
                  <div className="text-left md:text-center">
                    <p className="font-semibold text-slate-900">{f.views}</p>
                    <p className="text-xs">Views</p>
                  </div>
                  <div className="text-left md:text-center">
                    <p className="font-semibold text-slate-900">{f.clicks}</p>
                    <p className="text-xs">Clicks</p>
                  </div>
                  <div className="text-left md:text-center">
                    <p className="font-semibold text-slate-900">{f.subscribers}</p>
                    <p className="text-xs">Subs</p>
                  </div>
                </div>
                <div
                  className={`justify-self-start md:justify-self-end text-xs font-medium px-2 py-1 rounded ${
                    f.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {f.status === "published" ? "Live" : "Draft"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-Resource Click Breakdown */}
      <ResourceClickBreakdown
        stats={resourceClickStats}
        fanflets={(fanflets || []).map((f) => ({ id: f.id, title: f.title }))}
      />

      {/* Survey / Feedback Results */}
      <SurveyResults
        results={surveyResultsData}
        fanflets={(fanflets || []).map((f) => ({ id: f.id, title: f.title }))}
      />
    </div>
  );
}
