import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadSponsorEntitlements } from "@fanflet/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, MousePointerClick, Link2, Bell, BarChart3 } from "lucide-react";
import { ContentPerformanceSection } from "./content-performance-section";
import type { ContentPerformanceRow, CrossSpeakerRow } from "./content-performance-section";

export default async function SponsorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/dashboard");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, demo_environment_id, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const demoEnvId = sponsor.demo_environment_id ?? null;
  const speakerLabel = (sponsor as { speaker_label?: string }).speaker_label ?? "speaker";

  let connectionsCount: number | null = null;
  let leadsCount: number | null = null;
  let pendingCount: number | null = null;
  let clicksCount = 0;

  if (demoEnvId) {
    const { data: speakersInDemo } = await supabase
      .from("speakers")
      .select("id")
      .eq("demo_environment_id", demoEnvId);
    const speakerIds = (speakersInDemo ?? []).map((s) => s.id);

    if (speakerIds.length === 0) {
      connectionsCount = 0;
      leadsCount = 0;
      pendingCount = 0;
    } else {
      const [
        { count: connCount },
        { count: pendCount },
      ] = await Promise.all([
        supabase
          .from("sponsor_connections")
          .select("*", { count: "exact", head: true })
          .eq("sponsor_id", sponsor.id)
          .eq("status", "active")
          .in("speaker_id", speakerIds),
        supabase
          .from("sponsor_connections")
          .select("*", { count: "exact", head: true })
          .eq("sponsor_id", sponsor.id)
          .eq("status", "pending")
          .in("speaker_id", speakerIds),
      ]);
      connectionsCount = connCount ?? 0;
      pendingCount = pendCount ?? 0;

      const { data: fanfletsInDemo } = await supabase
        .from("fanflets")
        .select("id")
        .in("speaker_id", speakerIds);
      const fanfletIds = (fanfletsInDemo ?? []).map((f) => f.id);
      if (fanfletIds.length > 0) {
        const { count: leadCount } = await supabase
          .from("sponsor_leads")
          .select("*", { count: "exact", head: true })
          .eq("sponsor_id", sponsor.id)
          .in("fanflet_id", fanfletIds);
        leadsCount = leadCount ?? 0;
      } else {
        leadsCount = 0;
      }

      const blockIdsRes = await supabase
        .from("resource_blocks")
        .select("id, fanflet_id")
        .eq("sponsor_account_id", sponsor.id);
      const blocks = blockIdsRes.data ?? [];
      const demoFanfletIds = new Set(fanfletIds);
      const demoBlockIds = blocks
        .filter((b) => demoFanfletIds.has(b.fanflet_id))
        .map((b) => b.id);
      if (demoBlockIds.length > 0) {
        const { count } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", "resource_click")
          .in("resource_block_id", demoBlockIds);
        clicksCount = count ?? 0;
      }
    }
  } else {
    const [
      { count: connCount },
      { count: leadCount },
      { count: pendCount },
    ] = await Promise.all([
      supabase
        .from("sponsor_connections")
        .select("*", { count: "exact", head: true })
        .eq("sponsor_id", sponsor.id)
        .eq("status", "active"),
      supabase
        .from("sponsor_leads")
        .select("*", { count: "exact", head: true })
        .eq("sponsor_id", sponsor.id),
      supabase
        .from("sponsor_connections")
        .select("*", { count: "exact", head: true })
        .eq("sponsor_id", sponsor.id)
        .eq("status", "pending"),
    ]);
    connectionsCount = connCount ?? 0;
    leadsCount = leadCount ?? 0;
    pendingCount = pendCount ?? 0;

    const blockIdsRes = await supabase
      .from("resource_blocks")
      .select("id")
      .eq("sponsor_account_id", sponsor.id);
    const blockIds = (blockIdsRes.data ?? []).map((b) => b.id);
    if (blockIds.length > 0) {
      const { count } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "resource_click")
        .in("resource_block_id", blockIds);
      clicksCount = count ?? 0;
    }
  }

  const pendingRequests = pendingCount ?? 0;

  // Content Performance: fanflet IDs in scope (demo or all)
  let fanfletIdsInScope: string[] = [];
  if (demoEnvId) {
    const { data: speakersInDemo } = await supabase
      .from("speakers")
      .select("id")
      .eq("demo_environment_id", demoEnvId);
    const speakerIds = (speakersInDemo ?? []).map((s) => s.id);
    if (speakerIds.length > 0) {
      const { data: fanfletsInDemo } = await supabase
        .from("fanflets")
        .select("id")
        .in("speaker_id", speakerIds);
      fanfletIdsInScope = (fanfletsInDemo ?? []).map((f) => f.id);
    }
  } else {
    const { data: blocksForScope } = await supabase
      .from("resource_blocks")
      .select("fanflet_id")
      .eq("sponsor_account_id", sponsor.id);
    fanfletIdsInScope = [...new Set((blocksForScope ?? []).map((b) => b.fanflet_id))];
  }

  let contentPerformanceRows: ContentPerformanceRow[] = [];
  let crossSpeakerRows: CrossSpeakerRow[] = [];
  let placementCount = 0;

  if (fanfletIdsInScope.length > 0) {
    const { data: blocks } = await supabase
      .from("resource_blocks")
      .select("id, fanflet_id, title, block_type")
      .eq("sponsor_account_id", sponsor.id)
      .in("fanflet_id", fanfletIdsInScope);
    const blockList = blocks ?? [];
    placementCount = blockList.length;

    if (blockList.length > 0) {
      const fanfletIdsSet = new Set(fanfletIdsInScope);
      const blockIds = blockList.map((b) => b.id);

      const [{ data: fanfletsData }, { data: impressionsData }, { data: clicksData }, { data: leadsData }] = await Promise.all([
        supabase.from("fanflets").select("id, title, speaker_id").in("id", fanfletIdsInScope),
        supabase
          .from("analytics_events")
          .select("fanflet_id")
          .eq("event_type", "page_view")
          .in("fanflet_id", fanfletIdsInScope)
          .or("source.is.null,source.neq.portfolio"),
        supabase
          .from("analytics_events")
          .select("resource_block_id")
          .eq("event_type", "resource_click")
          .in("resource_block_id", blockIds),
        supabase
          .from("sponsor_leads")
          .select("resource_block_id")
          .eq("sponsor_id", sponsor.id)
          .in("fanflet_id", fanfletIdsInScope),
      ]);

      const fanflets = fanfletsData ?? [];
      const speakerIds = [...new Set(fanflets.map((f) => f.speaker_id))];
      const { data: speakersData } = await supabase
        .from("speakers")
        .select("id, name")
        .in("id", speakerIds);
      const speakers = speakersData ?? [];
      const speakerMap = new Map(speakers.map((s) => [s.id, s]));
      const fanfletMap = new Map(fanflets.map((f) => [f.id, f]));

      const impressionsByFanflet: Record<string, number> = {};
      for (const e of impressionsData ?? []) {
        const fid = (e as { fanflet_id: string }).fanflet_id;
        if (fanfletIdsSet.has(fid)) impressionsByFanflet[fid] = (impressionsByFanflet[fid] ?? 0) + 1;
      }
      const clicksByBlock: Record<string, number> = {};
      for (const e of clicksData ?? []) {
        const bid = (e as { resource_block_id: string }).resource_block_id;
        clicksByBlock[bid] = (clicksByBlock[bid] ?? 0) + 1;
      }
      const leadsByBlock: Record<string, number> = {};
      for (const r of leadsData ?? []) {
        const bid = (r as { resource_block_id: string | null }).resource_block_id;
        if (bid) leadsByBlock[bid] = (leadsByBlock[bid] ?? 0) + 1;
      }

      contentPerformanceRows = blockList.map((b) => {
        const fanflet = fanfletMap.get(b.fanflet_id);
        const speaker = fanflet ? speakerMap.get(fanflet.speaker_id) : null;
        const impressions = impressionsByFanflet[b.fanflet_id] ?? 0;
        const clicks = clicksByBlock[b.id] ?? 0;
        const leads = leadsByBlock[b.id] ?? 0;
        const engagementRate = impressions > 0 ? clicks / impressions : 0;
        return {
          resource_block_id: b.id,
          resource_title: b.title ?? "",
          block_type: b.block_type ?? "link",
          fanflet_id: b.fanflet_id,
          fanflet_title: fanflet?.title ?? "",
          speaker_id: fanflet?.speaker_id ?? "",
          speaker_name: speaker?.name ?? "",
          impressions,
          clicks,
          engagement_rate: engagementRate,
          leads,
        };
      });

      // Cross-speaker rollup
      const rowsBySpeaker = new Map<string, ContentPerformanceRow[]>();
      for (const r of contentPerformanceRows) {
        if (!r.speaker_id) continue;
        if (!rowsBySpeaker.has(r.speaker_id)) rowsBySpeaker.set(r.speaker_id, []);
        rowsBySpeaker.get(r.speaker_id)!.push(r);
      }
      crossSpeakerRows = Array.from(rowsBySpeaker.entries()).map(([speakerId, speakerRows]) => {
        const fanfletIdsForSpeaker = new Set(speakerRows.map((row) => row.fanflet_id));
        const totalImpressions = speakerRows.reduce((sum, row) => sum + row.impressions, 0);
        const totalClicks = speakerRows.reduce((sum, row) => sum + row.clicks, 0);
        const totalLeads = speakerRows.reduce((sum, row) => sum + row.leads, 0);
        const rates = speakerRows.filter((r) => r.impressions > 0).map((r) => r.engagement_rate);
        const avgEngagement = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        return {
          speaker_id: speakerId,
          speaker_name: speakerRows[0]?.speaker_name ?? "",
          fanflet_count: fanfletIdsForSpeaker.size,
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          avg_engagement_rate: avgEngagement,
          total_leads: totalLeads,
        };
      });
    }
  }

  const entitlements = await loadSponsorEntitlements(supabase, sponsor.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your engagement and leads.</p>
      </div>

      {pendingRequests > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Bell className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              {pendingRequests} connection request{pendingRequests !== 1 ? "s" : ""} waiting for your review
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Accept or decline {speakerLabel} requests to control who can feature your content.
            </p>
          </div>
          <Link
            href="/sponsor/connections"
            className="shrink-0 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Review requests
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/sponsor/connections" className="block group">
          <Card className="transition-all duration-200 group-hover:border-[#3BA5D9]/50 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active connections</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground group-hover:text-[#3BA5D9] transition-colors" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{connectionsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">{speakerLabel[0].toUpperCase() + speakerLabel.slice(1)}s you&apos;re connected with</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sponsor/leads" className="block group">
          <Card className="transition-all duration-200 group-hover:border-[#3BA5D9]/50 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-[#3BA5D9] transition-colors" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{leadsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Consented subscribers who engaged</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sponsor/analytics" className="block group">
          <Card className="transition-all duration-200 group-hover:border-[#3BA5D9]/50 group-hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground group-hover:text-[#3BA5D9] transition-colors" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{clicksCount}</p>
              <p className="text-xs text-muted-foreground">Clicks on your content</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>View and export leads, or manage {speakerLabel} connections.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/sponsor/analytics"
            className="inline-flex items-center rounded-md bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#152b4d]"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Full Analytics
          </Link>
          <Link
            href="/sponsor/leads"
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View leads
          </Link>
          <Link
            href="/sponsor/connections"
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Connections
          </Link>
        </CardContent>
      </Card>

      <ContentPerformanceSection
        rows={contentPerformanceRows}
        crossSpeakerRows={crossSpeakerRows}
        placementCount={placementCount}
        entitlements={entitlements}
        speakerLabel={speakerLabel}
      />
    </div>
  );
}
