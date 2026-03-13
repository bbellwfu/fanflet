import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Eye, MousePointerClick, Users, Percent,
  TrendingUp, TrendingDown, Minus, Smartphone, Globe, Filter,
  Link2, FileDown, Building2, Type,
} from "lucide-react";
import {
  getSpeakerKPIs,
  getSpeakerDeviceBreakdown,
  getSpeakerReferrerBreakdown,
  getSpeakerResourceTypePerformance,
} from "@fanflet/core";
import type { DateRange } from "@fanflet/core";
import { ResourceClickBreakdown } from "@/components/analytics/resource-click-breakdown";
import { SurveyResults, type SurveyResultData } from "@/components/analytics/survey-results";
import { LockedFeatureCard } from "@/components/analytics/locked-feature-card";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { DeviceChart } from "@/components/analytics/device-chart";
import { ReferrerChart } from "@/components/analytics/referrer-chart";

export const metadata = {
  title: "Analytics",
};

function buildDateRange(
  rangeParam: string | undefined,
  fromParam?: string,
  toParam?: string
): { range: DateRange | undefined; days: number | null } {
  if (rangeParam === "custom") {
    const from = fromParam ? new Date(fromParam) : new Date();
    const to = toParam ? new Date(toParam) : new Date();
    // Ensure "to" includes the full end of the day if just a date is provided
    if (toParam && !toParam.includes("T")) {
      to.setHours(23, 59, 59, 999);
    }
    return { range: { from: from.toISOString(), to: to.toISOString() }, days: null };
  }

  if (!rangeParam || rangeParam === "30") {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { range: { from: from.toISOString(), to: to.toISOString() }, days: 30 };
  }
  if (rangeParam === "all") return { range: undefined, days: null };
  const days = parseInt(rangeParam, 10);
  if (isNaN(days) || days <= 0) return { range: undefined, days: null };
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { range: { from: from.toISOString(), to: to.toISOString() }, days };
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-emerald-600">
        <TrendingUp className="w-3 h-3 mr-0.5" /> New
      </span>
    );
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-slate-500">
        <Minus className="w-3 h-3 mr-0.5" /> 0%
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-emerald-600">
        <TrendingUp className="w-3 h-3 mr-0.5" /> +{change.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium text-red-500">
      <TrendingDown className="w-3 h-3 mr-0.5" /> {change.toFixed(1)}%
    </span>
  );
}

const TYPE_ICONS: Record<string, typeof Link2> = {
  link: Link2,
  file: FileDown,
  sponsor: Building2,
  text: Type,
};

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const resolvedParams = await searchParams;
  const rangeParam = resolvedParams.range;
  const fromParam = resolvedParams.from;
  const toParam = resolvedParams.to;
  
  const { range, days: rangeDays } = buildDateRange(rangeParam, fromParam, toParam);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/dashboard/settings");

  const entitlements = await getSpeakerEntitlements(speaker.id);
  const hasBasicStats = entitlements.features.has("basic_engagement_stats");
  const hasClickAnalytics = entitlements.features.has("click_through_analytics");
  const canSeeAnalytics = hasBasicStats || hasClickAnalytics;

  if (!canSeeAnalytics) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-muted-foreground">Track engagement across your Fanflets.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Upgrade to view analytics</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Basic engagement stats and click-through analytics are available on higher plans.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/settings#subscription">View plans and upgrade</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  // Fetch all fanflets for this speaker
  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id, title, event_name, slug, status")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: false });

  const fanfletIds = (fanflets || []).map((f) => f.id);

  // Always fetch basic aggregate stats (free tier)
  let totalUniqueViews = 0;
  let totalClicks = 0;
  let totalSubscribers = 0;
  const viewsByFanflet: Record<string, number> = {};
  const clicksByFanflet: Record<string, number> = {};
  const subsByFanflet: Record<string, number> = {};

  if (fanfletIds.length > 0) {
    const [pageViewResult, clickResult, subsResult, perFanfletSubsResult] =
      await Promise.all([
        supabase.from("analytics_events").select("fanflet_id, visitor_hash")
          .in("fanflet_id", fanfletIds).eq("event_type", "page_view"),
        supabase.from("analytics_events").select("fanflet_id")
          .in("fanflet_id", fanfletIds).eq("event_type", "resource_click"),
        supabase.from("subscribers").select("*", { count: "exact", head: true })
          .eq("speaker_id", speaker.id),
        supabase.from("subscribers").select("source_fanflet_id")
          .eq("speaker_id", speaker.id),
      ]);

    const globalUniqueHashes = new Set<string>();
    const perFanfletHashes: Record<string, Set<string>> = {};
    for (const evt of pageViewResult.data || []) {
      globalUniqueHashes.add(evt.visitor_hash);
      const fid = evt.fanflet_id as string;
      if (!perFanfletHashes[fid]) perFanfletHashes[fid] = new Set();
      perFanfletHashes[fid].add(evt.visitor_hash);
    }
    totalUniqueViews = globalUniqueHashes.size;
    for (const [fid, hashes] of Object.entries(perFanfletHashes)) {
      viewsByFanflet[fid] = hashes.size;
    }
    for (const evt of clickResult.data || []) {
      const fid = evt.fanflet_id as string;
      clicksByFanflet[fid] = (clicksByFanflet[fid] || 0) + 1;
    }
    totalClicks = (clickResult.data || []).length;
    totalSubscribers = subsResult.count || 0;
    for (const sub of perFanfletSubsResult.data || []) {
      const fid = sub.source_fanflet_id as string;
      if (fid) subsByFanflet[fid] = (subsByFanflet[fid] || 0) + 1;
    }
  }

  // Pro-tier data (only fetch if entitled)
  const kpisResult = hasClickAnalytics
    ? await getSpeakerKPIs(supabase, speaker.id, entitlements, range)
    : null;
  const kpis = kpisResult?.data;

  const deviceResult = hasClickAnalytics
    ? await getSpeakerDeviceBreakdown(supabase, speaker.id, entitlements, range)
    : null;
  const deviceData = deviceResult?.data ?? [];

  const referrerResult = hasClickAnalytics
    ? await getSpeakerReferrerBreakdown(supabase, speaker.id, entitlements, range)
    : null;
  const referrerData = referrerResult?.data ?? [];

  const resourceTypeResult = hasClickAnalytics
    ? await getSpeakerResourceTypePerformance(supabase, speaker.id, entitlements, range)
    : null;
  const resourceTypeData = resourceTypeResult?.data ?? [];



  // Resource click breakdown (Pro)
  type ResourceClickStat = {
    fanflet_id: string;
    fanflet_title: string;
    resource_block_id: string;
    resource_title: string;
    resource_type: string;
    clicks: number;
  };
  let resourceClickStats: ResourceClickStat[] = [];

  if (hasClickAnalytics && fanfletIds.length > 0) {
    const { data: resourceBlocks } = await supabase
      .from("resource_blocks")
      .select("id, fanflet_id, title, type")
      .in("fanflet_id", fanfletIds);
    if (resourceBlocks && resourceBlocks.length > 0) {
      const { data: clickEvents } = await supabase
        .from("analytics_events")
        .select("resource_block_id")
        .in("fanflet_id", fanfletIds)
        .eq("event_type", "resource_click")
        .not("resource_block_id", "is", null);
      const clickCounts: Record<string, number> = {};
      (clickEvents || []).forEach((evt) => {
        const rbId = evt.resource_block_id as string;
        clickCounts[rbId] = (clickCounts[rbId] || 0) + 1;
      });
      const fanfletTitleMap: Record<string, string> = {};
      (fanflets || []).forEach((f) => { fanfletTitleMap[f.id] = f.title; });
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

  // Survey results
  let surveyResultsData: SurveyResultData[] = [];
  if (fanfletIds.length > 0) {
    const { data: fanfletsWithSurvey } = await supabase
      .from("fanflets")
      .select("id, title, survey_question_id")
      .in("id", fanfletIds)
      .not("survey_question_id", "is", null);
    if (fanfletsWithSurvey && fanfletsWithSurvey.length > 0) {
      const questionIds = [...new Set(fanfletsWithSurvey.map((f) => f.survey_question_id as string))];
      const { data: questions } = await supabase
        .from("survey_questions")
        .select("id, question_text, question_type")
        .in("id", questionIds);
      const questionMap: Record<string, { question_text: string; question_type: string }> = {};
      (questions || []).forEach((q) => { questionMap[q.id] = { question_text: q.question_text, question_type: q.question_type }; });
      const surveyFanfletIds = fanfletsWithSurvey.map((f) => f.id);
      const { data: responses } = await supabase
        .from("survey_responses")
        .select("fanflet_id, question_id, response_value")
        .in("fanflet_id", surveyFanfletIds);
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
          return {
            fanflet_id: f.id,
            fanflet_title: f.title,
            question_id: qId,
            question_text: questionMap[qId].question_text,
            question_type: questionMap[qId].question_type,
            responses: grouped[`${f.id}|${qId}`] || [],
          };
        });
    }
  }

  const fanfletStats = (fanflets || []).map((f) => ({
    ...f,
    views: viewsByFanflet[f.id] || 0,
    clicks: clicksByFanflet[f.id] || 0,
    subscribers: subsByFanflet[f.id] || 0,
  }));

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

  const rangeLabel = rangeDays === null ? "All Time" : `Last ${rangeDays} days`;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-muted-foreground">Track engagement across all your Fanflets.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasClickAnalytics && (
            <Suspense>
              <DateRangeSelector />
            </Suspense>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* KPI Cards                                                        */}
      {/* ================================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="#fanflet-performance" className="block group">
          <Card className="transition-all duration-200 group-hover:border-[#3BA5D9]/50 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium leading-tight">Unique Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground group-hover:text-[#3BA5D9] transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(kpis?.uniqueVisitors ?? totalUniqueViews).toLocaleString()}</div>
              {kpis && <ChangeIndicator current={kpis.uniqueVisitors} previous={kpis.prevUniqueVisitors} />}
            </CardContent>
          </Card>
        </Link>
        <Link href="#resource-click-breakdown" className="block group">
          <Card className="transition-all duration-200 group-hover:border-[#3BA5D9]/50 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium leading-tight">Resource Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground group-hover:text-[#3BA5D9] transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(kpis?.totalResourceClicks ?? totalClicks).toLocaleString()}</div>
              {kpis && <ChangeIndicator current={kpis.totalResourceClicks} previous={kpis.prevResourceClicks} />}
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis
                ? `${kpis.conversionRate.toFixed(1)}%`
                : totalUniqueViews > 0
                  ? `${((totalSubscribers / totalUniqueViews) * 100).toFixed(1)}%`
                  : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Subscribers / Unique Views</p>
          </CardContent>
        </Card>
        <Link href="/dashboard/subscribers" className="block">
          <Card className="transition-colors hover:border-slate-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium leading-tight">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(kpis?.totalSubscribers ?? totalSubscribers).toLocaleString()}</div>
              {kpis && <ChangeIndicator current={kpis.totalSubscribers} previous={kpis.prevSubscribers} />}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ================================================================ */}
      {/* Per-Fanflet Breakdown (Free tier)                                */}
      {/* ================================================================ */}
      <div id="fanflet-performance">
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
                  <Link
                    href={`/dashboard/subscribers?source=${f.id}`}
                    className="text-left md:text-center hover:text-[#1B365D]"
                  >
                    <p className="font-semibold text-slate-900">{f.subscribers}</p>
                    <p className="text-xs hover:underline">Subs</p>
                  </Link>
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
      </div>

      {/* ================================================================ */}
      {/* Pro-Tier: Device & Traffic Sources                               */}
      {/* ================================================================ */}
      {hasClickAnalytics ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Device Breakdown
              </CardTitle>
              <CardDescription>{rangeLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceChart data={deviceData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Traffic Sources
              </CardTitle>
              <CardDescription>{rangeLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReferrerChart data={referrerData} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <LockedFeatureCard
            title="Device Breakdown"
            description="See which devices your audience uses — mobile, desktop, or tablet."
            planRequired="Pro"
          >
            <div className="px-6 py-4">
              <DeviceChart data={[
                { device: "mobile", count: 60 },
                { device: "desktop", count: 30 },
                { device: "tablet", count: 10 },
              ]} />
            </div>
          </LockedFeatureCard>
          <LockedFeatureCard
            title="Traffic Sources"
            description="Understand where your visitors come from — QR codes, search, social, or direct."
            planRequired="Pro"
          >
            <div className="px-6 py-4">
              <ReferrerChart data={[
                { category: "QR Code", count: 45 },
                { category: "Direct", count: 30 },
                { category: "Search", count: 15 },
                { category: "Social", count: 10 },
              ]} />
            </div>
          </LockedFeatureCard>
        </div>
      )}

      {/* ================================================================ */}
      {/* Pro-Tier: Resource Type Performance                              */}
      {/* ================================================================ */}
      {hasClickAnalytics ? (
        resourceTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Resource Type Performance
              </CardTitle>
              <CardDescription>Which resource types get the most engagement ({rangeLabel}).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {resourceTypeData.map((rt) => {
                  const Icon = TYPE_ICONS[rt.type] ?? Link2;
                  return (
                    <div key={rt.type} className="rounded-lg border bg-slate-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-[#1B365D]/10 flex items-center justify-center text-[#1B365D]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium capitalize">{rt.type}</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{rt.totalClicks}</p>
                      <p className="text-xs text-muted-foreground">
                        {rt.avgClicksPerBlock.toFixed(1)} avg / block &middot; {rt.blockCount} blocks
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <LockedFeatureCard
          title="Resource Type Performance"
          description="See which types of resources — links, files, sponsor blocks — drive the most clicks."
          planRequired="Pro"
        />
      )}

      {/* Pro-Tier: Resource Click Breakdown */}
      {hasClickAnalytics ? (
        <div id="resource-click-breakdown">
          <ResourceClickBreakdown
            stats={resourceClickStats}
            fanflets={(fanflets || []).map((f) => ({ id: f.id, title: f.title }))}
          />
        </div>
      ) : (
        <LockedFeatureCard
          title="Resource Click Breakdown"
          description="Drill into click counts for every individual resource across your fanflets."
          planRequired="Pro"
        />
      )}

      {/* Survey / Feedback Results (Pro) */}
      {hasClickAnalytics && (
        <SurveyResults
          results={surveyResultsData}
          fanflets={(fanflets || []).map((f) => ({ id: f.id, title: f.title }))}
        />
      )}


    </div>
  );
}
