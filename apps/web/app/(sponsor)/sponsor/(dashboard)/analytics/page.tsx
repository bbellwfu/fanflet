import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SponsorAnalyticsClient } from "./analytics-client";
import {
  getSponsorKPIs,
  getSponsorFanfletPerformance,
  getSponsorResourceTypePerformance,
} from "@fanflet/core";
import type { DeviceBreakdown, ReferrerBreakdown } from "@fanflet/core";
import type { ResourceClickStat } from "@/components/analytics/resource-click-breakdown";

// We'll map the raw event sources into our simple categories
function classifyReferrer(referrer: string | null): string {
  if (!referrer) return "Direct";
  const r = referrer.toLowerCase();
  if (r.includes("google") || r.includes("bing") || r.includes("yahoo") || r.includes("duckduckgo")) return "Search";
  if (r.includes("linkedin") || r.includes("twitter") || r.includes("facebook") || r.includes("instagram") || r.includes("x.com") || r.includes("threads")) return "Social";
  if (r.includes("mail") || r.includes("outlook") || r.includes("gmail")) return "Email";
  return "Other";
}

export default async function SponsorAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; speakerId?: string; campaignId?: string; from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/analytics");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, demo_environment_id, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");
  const demoEnvId = sponsor.demo_environment_id ?? null;

  const rawLabel = (sponsor as { speaker_label?: string }).speaker_label || "Speaker";
  const singularLabel = rawLabel.replace(/s$/i, '');
  const speakerLabel = singularLabel ? singularLabel.charAt(0).toUpperCase() + singularLabel.slice(1) : "Speaker";

  const params = await searchParams;
  const range = params.range || "30";
  const fromParam = params.from;
  const toParam = params.to;
  const speakerIdFilter = params.speakerId || "all";
  const campaignIdFilter = params.campaignId || "all";

  // Calculate Date Range for core functions
  let dateRange;
  const fromDate = new Date();
  const toDate = new Date();
  if (range === "custom" && fromParam) {
    fromDate.setTime(new Date(fromParam).getTime());
    if (toParam) {
      toDate.setTime(new Date(toParam).getTime());
      if (!toParam.includes("T")) toDate.setHours(23, 59, 59, 999);
    }
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  } else if (range !== "all") {
    const days = parseInt(range, 10);
    fromDate.setDate(fromDate.getDate() - days);
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  } else { // range === "all"
    fromDate.setFullYear(2025, 0, 1); // Set to a very early date
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  }

  // 1. Fetch available Filters for the Dropsdowns
  const [connectionsRes, campaignsRes] = await Promise.all([
    supabase.from("sponsor_connections").select("speaker_id, speakers(id, name)").eq("sponsor_id", sponsor.id).eq("status", "active"),
    supabase.from("sponsor_campaigns").select("id, name, all_speakers_assigned").eq("sponsor_id", sponsor.id).order("created_at", { ascending: false }),
  ]);

  let demoSpeakerIdSet: Set<string> | null = null;
  if (demoEnvId) {
    const { data: speakersInDemo } = await supabase
      .from("speakers")
      .select("id")
      .eq("demo_environment_id", demoEnvId);
    demoSpeakerIdSet = new Set((speakersInDemo ?? []).map((s) => s.id));
  }

  const availableSpeakers = (connectionsRes.data ?? [])
    .filter(c => c.speakers)
    .map(c => {
      const speaker = c.speakers as unknown as { id: string; name: string };
      return { id: speaker.id, name: speaker.name };
    })
    .filter((s) => !demoSpeakerIdSet || demoSpeakerIdSet.has(s.id));
  const availableCampaigns = campaignsRes.data ?? [];

  // 2. Base Fanflet Resolution
  let fanfletIdsInScope: string[] = [];
  let baseSpeakerIds = availableSpeakers.map(s => s.id);
  if (campaignIdFilter !== "all") {
    const selectedCampaign = availableCampaigns.find(c => c.id === campaignIdFilter);
    if (selectedCampaign?.all_speakers_assigned !== true) {
      const { data: kolRes } = await supabase.from("sponsor_campaign_speakers").select("speaker_id").eq("campaign_id", campaignIdFilter);
      const campaignKOLs = (kolRes ?? []).map(k => k.speaker_id);
      baseSpeakerIds = baseSpeakerIds.filter(id => campaignKOLs.includes(id));
    }
    if (baseSpeakerIds.length === 0) fanfletIdsInScope = [];
  }
  if (speakerIdFilter !== "all") {
    baseSpeakerIds = baseSpeakerIds.includes(speakerIdFilter) ? [speakerIdFilter] : [];
  }
  if (baseSpeakerIds.length > 0) {
    const { data: fanfletsRes } = await supabase.from("fanflets").select("id").in("speaker_id", baseSpeakerIds);
    fanfletIdsInScope = (fanfletsRes ?? []).map(f => f.id);
  }

  // 3. Resolve which Resource Blocks we care about
  let blockIdsInScope: string[] = [];
  if (fanfletIdsInScope.length > 0) {
     let blockQuery = supabase
      .from("resource_blocks")
      .select("id, title, type, fanflet_id")
      .eq("sponsor_account_id", sponsor.id)
      .in("fanflet_id", fanfletIdsInScope);
     
     if (campaignIdFilter !== "all") {
       const { data: resourceCampaigns } = await supabase.from("sponsor_resource_campaigns").select("resource_id").eq("campaign_id", campaignIdFilter);
       const libIds = (resourceCampaigns ?? []).map(rc => rc.resource_id);
       if (libIds.length > 0) blockQuery = blockQuery.in("sponsor_library_item_id", libIds);
       else blockQuery = blockQuery.eq("id", "00000000-0000-0000-0000-000000000000");
     }
     const { data: blocks } = await blockQuery;
     blockIdsInScope = (blocks ?? []).map(b => b.id);
  }

  if (fanfletIdsInScope.length === 0) {
    return (
      <SponsorAnalyticsClient
        speakerLabel={speakerLabel}
        availableSpeakers={availableSpeakers}
        availableCampaigns={availableCampaigns}
        deviceData={[]}
        referrerData={[]}
        resourceClicks={[]}
        kpiData={{ uniqueVisitors: 0, totalResourceClicks: 0, totalLeads: 0, conversionRate: 0 }}
        fanfletStats={[]}
        resourceTypeStats={[]}
        hasData={false}
        fanfletIds={[]}
        blockIds={[]}
      />
    );
  }

  const eventsQuery = blockIdsInScope.length > 0
    ? supabase
        .from("analytics_events")
        .select("event_type, resource_block_id, fanflet_id, device_type, referrer, source")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .or(`and(event_type.eq.resource_click,resource_block_id.in.(${blockIdsInScope.join(",")})),and(event_type.eq.page_view,fanflet_id.in.(${fanfletIdsInScope.join(",")}))`)
    : supabase
        .from("analytics_events")
        .select("event_type, resource_block_id, fanflet_id, device_type, referrer, source")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .eq("event_type", "page_view")
        .in("fanflet_id", fanfletIdsInScope);

  const resourceTypePerfPromise = blockIdsInScope.length > 0
    ? getSponsorResourceTypePerformance(supabase, sponsor.id, blockIdsInScope, dateRange)
    : Promise.resolve({ data: [] as { type: string; totalClicks: number; avgClicksPerBlock: number; blockCount: number }[] });

  // 4. Fetch rich analytics from Core
  const [kpiRes, fanfletPerfRes, resourceTypePerfRes, eventsRes] = await Promise.all([
    getSponsorKPIs(supabase, sponsor.id, fanfletIdsInScope, blockIdsInScope, dateRange),
    getSponsorFanfletPerformance(supabase, sponsor.id, fanfletIdsInScope, blockIdsInScope, dateRange),
    resourceTypePerfPromise,
    eventsQuery,
  ]);

  const analyticsEvents = eventsRes.data ?? [];
  const kpiData = kpiRes.data || { uniqueVisitors: 0, totalResourceClicks: 0, totalLeads: 0, conversionRate: 0 };
  const fanfletStats = fanfletPerfRes.data ?? [];
  const resourceTypeStats = resourceTypePerfRes.data ?? [];

  // Device & Referrer Breakdown (still calc locally as core has speaker-specific versions or we can just reuse generic logic)
  const deviceCounts: Record<string, number> = {};
  const referrerCounts: Record<string, number> = {};
  for (const e of analyticsEvents) {
    if (e.event_type === "page_view") {
      const dev = e.device_type || "unknown";
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;

      let category: string;
      const src = e.source;
      if (src === "qr") category = "QR Code";
      else if (src === "portfolio") category = "Portfolio";
      else if (src === "share") category = "Share Link";
      else category = classifyReferrer(e.referrer);
      referrerCounts[category] = (referrerCounts[category] || 0) + 1;
    }
  }

  const deviceData: DeviceBreakdown[] = Object.entries(deviceCounts)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);
  const referrerData: ReferrerBreakdown[] = Object.entries(referrerCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Resource Clicks breakdown for table
  const { data: blocksMeta } = await supabase.from("resource_blocks").select("id, title, type").in("id", blockIdsInScope);
  const { data: fanfletsMeta } = await supabase.from("fanflets").select("id, title").in("id", fanfletIdsInScope);
  const blockMap = new Map((blocksMeta ?? []).map(b => [b.id, b]));
  const fanfletMap = new Map((fanfletsMeta ?? []).map(f => [f.id, f]));
  const clickCountsByBlock: Record<string, { count: number, fanfletId: string }> = {};
  for (const e of analyticsEvents) {
    if (e.event_type === "resource_click" && e.resource_block_id) {
      if (!clickCountsByBlock[e.resource_block_id]) clickCountsByBlock[e.resource_block_id] = { count: 0, fanfletId: e.fanflet_id };
      clickCountsByBlock[e.resource_block_id].count++;
    }
  }
  const resourceClicks: ResourceClickStat[] = Object.entries(clickCountsByBlock).map(([id, d]) => {
    const b = blockMap.get(id);
    const f = fanfletMap.get(d.fanfletId);
    return {
      fanflet_id: d.fanfletId,
      fanflet_title: f?.title || "Unknown",
      resource_block_id: id,
      resource_title: b?.title || "Untitled",
      resource_type: b?.type || "link",
      clicks: d.count
    };
  }).sort((a, b) => b.clicks - a.clicks);

  return (
    <SponsorAnalyticsClient
      speakerLabel={speakerLabel}
      availableSpeakers={availableSpeakers}
      availableCampaigns={availableCampaigns}
      deviceData={deviceData}
      referrerData={referrerData}
      resourceClicks={resourceClicks}
      kpiData={kpiData}
      fanfletStats={fanfletStats}
      resourceTypeStats={resourceTypeStats}
      hasData={analyticsEvents.length > 0 || kpiData.totalLeads > 0}
      fanfletIds={fanfletIdsInScope}
      blockIds={blockIdsInScope}
    />
  );
}
