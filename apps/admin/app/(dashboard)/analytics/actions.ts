"use server";

import { createServiceClient } from "@fanflet/db/service";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DateRange {
  from: string; // ISO date string
  to: string;
}

export interface TimeSeriesPoint {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  subscribers: number;
  resourceClicks: number;
}

export interface DeviceBreakdown {
  device: string;
  count: number;
}

export interface ReferrerBreakdown {
  category: string;
  count: number;
}

export interface TopFanflet {
  id: string;
  title: string;
  speakerName: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
  subscribers: number;
  conversionRate: number;
}

export interface EventDistribution {
  eventType: string;
  count: number;
}

export interface HeatmapCell {
  dayOfWeek: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  count: number;
}

export interface SpeakerRanking {
  id: string;
  name: string;
  email: string;
  fanfletCount: number;
  totalViews: number;
  totalSubscribers: number;
  conversionRate: number;
  topFanfletTitle: string | null;
}

export interface FanfletRanking {
  id: string;
  title: string;
  speakerName: string;
  views: number;
  clicks: number;
  subscribers: number;
  qrPercent: number;
  status: string;
}

export interface ResourceTypePerformance {
  type: string;
  totalClicks: number;
  avgClicksPerBlock: number;
  blockCount: number;
}

export interface GrowthPoint {
  date: string;
  count: number;
}

export interface PlatformKPIs {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSubscribers: number;
  conversionRate: number;
  totalResourceClicks: number;
  qrAdoptionRate: number;
  prevPageViews: number;
  prevUniqueVisitors: number;
  prevSubscribers: number;
  prevResourceClicks: number;
  botEvents: number;
  totalEvents: number;
}

export interface EngagementRow {
  fanfletId: string;
  fanfletTitle: string;
  eventName: string | null;
  speakerName: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
  subscribers: number;
  conversionRate: number;
  status: string;
}

export interface GeoBreakdown {
  countryCode: string;
  city: string | null;
  count: number;
}

export interface BotVsHumanSummary {
  totalEvents: number;
  botEvents: number;
  humanEvents: number;
  botPercent: number;
}

export interface ReferrerDetail {
  domain: string;
  category: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function defaultRange(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function prevRange(range: DateRange): DateRange {
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  const duration = toDate.getTime() - fromDate.getTime();
  return {
    from: new Date(fromDate.getTime() - duration).toISOString(),
    to: range.from,
  };
}

function classifyReferrer(referrer: string | null): string {
  if (!referrer) return "Direct";
  const r = referrer.toLowerCase();
  if (r.includes("google") || r.includes("bing") || r.includes("yahoo") || r.includes("duckduckgo")) return "Search";
  if (r.includes("linkedin") || r.includes("twitter") || r.includes("facebook") || r.includes("instagram") || r.includes("x.com") || r.includes("threads")) return "Social";
  if (r.includes("mail") || r.includes("outlook") || r.includes("gmail")) return "Email";
  if (r.includes("slack") || r.includes("teams") || r.includes("discord") || r.includes("telegram")) return "Messaging";
  return "Other";
}

const REFERRER_CATEGORY_LABELS: Record<string, string> = {
  direct: "Direct",
  qr_code: "QR Code",
  portfolio: "Portfolio",
  share_link: "Share Link",
  search: "Search",
  social: "Social",
  email: "Email",
  messaging: "Messaging",
  internal: "Internal",
  other: "Other",
};

function toDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

/** Sentinel UUID used so .in("fanflet_id", []) is valid and returns no rows. */
const EMPTY_FANFLET_SENTINEL = "00000000-0000-0000-0000-000000000000";

/**
 * Returns fanflet IDs and speaker IDs for non-demo accounts (is_demo is null or false).
 * Used to exclude demo traffic and subscribers from platform analytics.
 * Exported for use by admin overview and other platform-wide queries.
 */
export async function getNonDemoScope(supabase: ReturnType<typeof createServiceClient>): Promise<{
  fanfletIds: string[];
  speakerIds: string[];
}> {
  const { data: speakers } = await supabase
    .from("speakers")
    .select("id")
    .or("is_demo.is.null,is_demo.eq.false");
  const speakerIds = (speakers ?? []).map((s) => s.id);
  if (speakerIds.length === 0) {
    return { fanfletIds: [EMPTY_FANFLET_SENTINEL], speakerIds: [EMPTY_FANFLET_SENTINEL] };
  }
  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id")
    .in("speaker_id", speakerIds);
  const fanfletIds = (fanflets ?? []).map((f) => f.id);
  if (fanfletIds.length === 0) {
    return { fanfletIds: [EMPTY_FANFLET_SENTINEL], speakerIds };
  }
  return { fanfletIds, speakerIds };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  Platform KPIs                                                      */
/* ------------------------------------------------------------------ */

export async function getPlatformKPIs(range?: DateRange): Promise<PlatformKPIs> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);
  const prev = prevRange(r);

  const [
    viewsResult,
    clicksResult,
    subsResult,
    qrResult,
    prevViewsResult,
    prevClicksResult,
    prevSubsResult,
    botCountResult,
    totalCountResult,
  ] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("visitor_hash")
      .eq("event_type", "page_view")
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "resource_click")
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "qr_scan")
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("analytics_events")
      .select("visitor_hash")
      .eq("event_type", "page_view")
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", prev.from)
      .lte("created_at", prev.to),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "resource_click")
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", prev.from)
      .lte("created_at", prev.to),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .in("speaker_id", speakerIds)
      .gte("created_at", prev.from)
      .lte("created_at", prev.to),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
  ]);

  const viewData = viewsResult.data ?? [];
  const uniqueHashes = new Set(viewData.map((e) => e.visitor_hash).filter(Boolean));
  const totalPageViews = viewData.length;
  const uniqueVisitors = uniqueHashes.size;
  const totalSubscribers = subsResult.count ?? 0;
  const totalResourceClicks = clicksResult.count ?? 0;
  const qrScans = qrResult.count ?? 0;

  const prevViewData = prevViewsResult.data ?? [];
  const prevUniqueHashes = new Set(prevViewData.map((e) => e.visitor_hash).filter(Boolean));

  return {
    totalPageViews,
    uniqueVisitors,
    totalSubscribers,
    conversionRate: uniqueVisitors > 0 ? (totalSubscribers / uniqueVisitors) * 100 : 0,
    totalResourceClicks,
    qrAdoptionRate: totalPageViews > 0 ? (qrScans / totalPageViews) * 100 : 0,
    prevPageViews: prevViewData.length,
    prevUniqueVisitors: prevUniqueHashes.size,
    prevSubscribers: prevSubsResult.count ?? 0,
    prevResourceClicks: prevClicksResult.count ?? 0,
    botEvents: botCountResult.count ?? 0,
    totalEvents: totalCountResult.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Time Series                                                        */
/* ------------------------------------------------------------------ */

export async function getPlatformTimeSeries(range?: DateRange): Promise<TimeSeriesPoint[]> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(60);

  const [eventsResult, subsResult] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("event_type, visitor_hash, created_at")
      .in("event_type", ["page_view", "resource_click"])
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to)
      .order("created_at"),
    supabase
      .from("subscribers")
      .select("created_at")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
  ]);

  const byDate: Record<string, { views: number; uniqueHashes: Set<string>; clicks: number; subs: number }> = {};

  for (const ev of eventsResult.data ?? []) {
    const key = toDateKey(ev.created_at);
    if (!byDate[key]) byDate[key] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
    if (ev.event_type === "page_view") {
      byDate[key].views++;
      if (ev.visitor_hash) byDate[key].uniqueHashes.add(ev.visitor_hash);
    } else if (ev.event_type === "resource_click") {
      byDate[key].clicks++;
    }
  }

  for (const sub of subsResult.data ?? []) {
    const key = toDateKey(sub.created_at);
    if (!byDate[key]) byDate[key] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
    byDate[key].subs++;
  }

  const fromDate = new Date(r.from);
  const toDate = new Date(r.to);
  const result: TimeSeriesPoint[] = [];
  const current = new Date(fromDate);
  current.setHours(0, 0, 0, 0);

  while (current <= toDate) {
    const key = current.toISOString().split("T")[0];
    const bucket = byDate[key];
    result.push({
      date: key,
      pageViews: bucket?.views ?? 0,
      uniqueVisitors: bucket?.uniqueHashes.size ?? 0,
      subscribers: bucket?.subs ?? 0,
      resourceClicks: bucket?.clicks ?? 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Device Breakdown                                                   */
/* ------------------------------------------------------------------ */

export async function getDeviceBreakdown(range?: DateRange): Promise<DeviceBreakdown[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data } = await supabase
    .from("analytics_events")
    .select("device_type")
    .eq("event_type", "page_view")
    .neq("is_bot", true)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const device = row.device_type || "unknown";
    counts[device] = (counts[device] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/*  Referrer Breakdown                                                 */
/* ------------------------------------------------------------------ */

export async function getReferrerBreakdown(range?: DateRange): Promise<ReferrerBreakdown[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data } = await supabase
    .from("analytics_events")
    .select("referrer, source, referrer_category")
    .eq("event_type", "page_view")
    .neq("is_bot", true)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const rc = (row as { referrer_category?: string | null }).referrer_category;
    let category: string;
    if (rc) {
      category = REFERRER_CATEGORY_LABELS[rc] ?? rc;
    } else {
      const src = (row as { source?: string | null }).source;
      if (src === "qr") {
        category = "QR Code";
      } else if (src === "portfolio") {
        category = "Portfolio";
      } else if (src === "share") {
        category = "Share Link";
      } else {
        category = classifyReferrer(row.referrer);
      }
    }
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/*  Event Type Distribution                                            */
/* ------------------------------------------------------------------ */

export async function getEventDistribution(range?: DateRange): Promise<EventDistribution[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data } = await supabase
    .from("analytics_events")
    .select("event_type")
    .neq("is_bot", true)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
  }

  const labelMap: Record<string, string> = {
    page_view: "Page Views",
    resource_click: "Resource Clicks",
    resource_download: "Downloads",
    qr_scan: "QR Scans",
    sms_bookmark: "SMS Bookmarks",
    referral_click: "Referral Clicks",
    email_signup: "Email Signups",
  };

  return Object.entries(counts)
    .map(([eventType, count]) => ({ eventType: labelMap[eventType] ?? eventType, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/*  Top Fanflets                                                       */
/* ------------------------------------------------------------------ */

export async function getTopFanflets(range?: DateRange, limit = 10): Promise<TopFanflet[]> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const [eventsResult, subsResult, fanfletsResult] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("fanflet_id, event_type, visitor_hash")
      .in("event_type", ["page_view", "resource_click"])
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("subscribers")
      .select("source_fanflet_id")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("fanflets")
      .select("id, title, speaker_id, speakers(name)")
      .eq("status", "published")
      .in("id", fanfletIds),
  ]);

  const fanfletMap = new Map<string, { title: string; speakerName: string }>();
  for (const f of fanfletsResult.data ?? []) {
    const speaker = f.speakers as unknown as { name: string } | null;
    fanfletMap.set(f.id, { title: f.title, speakerName: speaker?.name ?? "Unknown" });
  }

  const stats: Record<string, { views: number; uniqueHashes: Set<string>; clicks: number; subs: number }> = {};
  const fanfletIdSet = new Set(fanfletIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL));

  for (const ev of eventsResult.data ?? []) {
    const fid = ev.fanflet_id;
    if (!fanfletIdSet.has(fid)) continue;
    if (!stats[fid]) stats[fid] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
    if (ev.event_type === "page_view") {
      stats[fid].views++;
      if (ev.visitor_hash) stats[fid].uniqueHashes.add(ev.visitor_hash);
    } else {
      stats[fid].clicks++;
    }
  }

  for (const sub of subsResult.data ?? []) {
    const fid = sub.source_fanflet_id;
    if (fid) {
      if (!stats[fid]) stats[fid] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
      stats[fid].subs++;
    }
  }

  return Object.entries(stats)
    .map(([id, s]) => {
      const info = fanfletMap.get(id);
      const uniques = s.uniqueHashes.size;
      return {
        id,
        title: info?.title ?? "Unknown",
        speakerName: info?.speakerName ?? "Unknown",
        views: s.views,
        uniqueVisitors: uniques,
        clicks: s.clicks,
        subscribers: s.subs,
        conversionRate: uniques > 0 ? (s.subs / uniques) * 100 : 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Peak Activity Heatmap                                              */
/* ------------------------------------------------------------------ */

export async function getPeakActivityHeatmap(range?: DateRange): Promise<HeatmapCell[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data } = await supabase
    .from("analytics_events")
    .select("created_at")
    .neq("is_bot", true)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const grid: Record<string, number> = {};
  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getUTCDay()}-${d.getUTCHours()}`;
    grid[key] = (grid[key] ?? 0) + 1;
  }

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ dayOfWeek: day, hour, count: grid[`${day}-${hour}`] ?? 0 });
    }
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Engagement (per-fanflet table)                                     */
/* ------------------------------------------------------------------ */

export async function getEngagementTable(range?: DateRange): Promise<EngagementRow[]> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const [eventsResult, subsResult, fanfletsResult] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("fanflet_id, event_type, visitor_hash")
      .in("event_type", ["page_view", "resource_click"])
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("subscribers")
      .select("source_fanflet_id")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("fanflets")
      .select("id, title, event_name, status, speaker_id, speakers(name)")
      .in("id", fanfletIds),
  ]);

  const fanfletMap = new Map<string, { title: string; eventName: string | null; speakerName: string; status: string }>();
  for (const f of fanfletsResult.data ?? []) {
    const speaker = f.speakers as unknown as { name: string } | null;
    fanfletMap.set(f.id, {
      title: f.title,
      eventName: f.event_name,
      speakerName: speaker?.name ?? "Unknown",
      status: f.status,
    });
  }

  const stats: Record<string, { views: number; uniqueHashes: Set<string>; clicks: number; subs: number }> = {};
  const fanfletIdSet = new Set(fanfletIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL));

  for (const ev of eventsResult.data ?? []) {
    const fid = ev.fanflet_id;
    if (!fanfletIdSet.has(fid)) continue;
    if (!stats[fid]) stats[fid] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
    if (ev.event_type === "page_view") {
      stats[fid].views++;
      if (ev.visitor_hash) stats[fid].uniqueHashes.add(ev.visitor_hash);
    } else {
      stats[fid].clicks++;
    }
  }

  for (const sub of subsResult.data ?? []) {
    const fid = sub.source_fanflet_id;
    if (fid) {
      if (!stats[fid]) stats[fid] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
      stats[fid].subs++;
    }
  }

  return Object.entries(stats)
    .map(([fid, s]) => {
      const info = fanfletMap.get(fid);
      const uniques = s.uniqueHashes.size;
      return {
        fanfletId: fid,
        fanfletTitle: info?.title ?? "Unknown",
        eventName: info?.eventName ?? null,
        speakerName: info?.speakerName ?? "Unknown",
        views: s.views,
        uniqueVisitors: uniques,
        clicks: s.clicks,
        subscribers: s.subs,
        conversionRate: uniques > 0 ? (s.subs / uniques) * 100 : 0,
        status: info?.status ?? "unknown",
      };
    })
    .sort((a, b) => b.views - a.views);
}

/* ------------------------------------------------------------------ */
/*  Resource Click Breakdown                                           */
/* ------------------------------------------------------------------ */

export async function getResourceClickBreakdown(range?: DateRange): Promise<{
  resourceBlockId: string;
  fanfletTitle: string;
  resourceTitle: string;
  resourceType: string;
  clicks: number;
}[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data: clickEvents } = await supabase
    .from("analytics_events")
    .select("resource_block_id")
    .eq("event_type", "resource_click")
    .neq("is_bot", true)
    .not("resource_block_id", "is", null)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const counts: Record<string, number> = {};
  for (const ev of clickEvents ?? []) {
    if (ev.resource_block_id) {
      counts[ev.resource_block_id] = (counts[ev.resource_block_id] ?? 0) + 1;
    }
  }

  const blockIds = Object.keys(counts);
  if (blockIds.length === 0) return [];

  const fanfletIdSet = new Set(fanfletIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL));
  const { data: blocks } = await supabase
    .from("resource_blocks")
    .select("id, title, type, fanflet_id, fanflets(title)")
    .in("id", blockIds);

  return (blocks ?? [])
    .filter((b) => fanfletIdSet.has(b.fanflet_id))
    .map((b) => {
      const fanflet = b.fanflets as unknown as { title: string } | null;
      return {
        resourceBlockId: b.id,
        fanfletTitle: fanflet?.title ?? "Unknown",
        resourceTitle: b.title ?? "Untitled",
        resourceType: b.type,
        clicks: counts[b.id] ?? 0,
      };
    })
    .sort((a, b) => b.clicks - a.clicks);
}

/* ------------------------------------------------------------------ */
/*  Speaker Leaderboard                                                */
/* ------------------------------------------------------------------ */

export async function getSpeakerLeaderboard(range?: DateRange): Promise<SpeakerRanking[]> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);
  const speakerIdSet = new Set(speakerIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL));

  const [speakersResult, fanfletsResult, eventsResult, subsResult] = await Promise.all([
    supabase.from("speakers").select("id, name, email").in("id", speakerIds),
    supabase.from("fanflets").select("id, title, speaker_id").eq("status", "published").in("id", fanfletIds),
    supabase
      .from("analytics_events")
      .select("fanflet_id, visitor_hash")
      .eq("event_type", "page_view")
      .neq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("subscribers")
      .select("speaker_id")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
  ]);

  const speakerMap = new Map<string, { name: string; email: string }>();
  for (const s of speakersResult.data ?? []) {
    speakerMap.set(s.id, { name: s.name, email: s.email });
  }

  const fanfletToSpeaker = new Map<string, string>();
  const speakerFanflets = new Map<string, string[]>();
  for (const f of fanfletsResult.data ?? []) {
    fanfletToSpeaker.set(f.id, f.speaker_id);
    const list = speakerFanflets.get(f.speaker_id) ?? [];
    list.push(f.id);
    speakerFanflets.set(f.speaker_id, list);
  }

  const speakerViews = new Map<string, { total: number; uniqueHashes: Set<string> }>();
  for (const ev of eventsResult.data ?? []) {
    const sid = fanfletToSpeaker.get(ev.fanflet_id);
    if (!sid) continue;
    if (!speakerViews.has(sid)) speakerViews.set(sid, { total: 0, uniqueHashes: new Set() });
    const entry = speakerViews.get(sid)!;
    entry.total++;
    if (ev.visitor_hash) entry.uniqueHashes.add(ev.visitor_hash);
  }

  const speakerSubs = new Map<string, number>();
  for (const sub of subsResult.data ?? []) {
    if (sub.speaker_id) {
      speakerSubs.set(sub.speaker_id, (speakerSubs.get(sub.speaker_id) ?? 0) + 1);
    }
  }

  // Find top fanflet per speaker by views
  const fanfletViews = new Map<string, number>();
  for (const ev of eventsResult.data ?? []) {
    fanfletViews.set(ev.fanflet_id, (fanfletViews.get(ev.fanflet_id) ?? 0) + 1);
  }

  const fanfletTitles = new Map<string, string>();
  for (const f of fanfletsResult.data ?? []) {
    fanfletTitles.set(f.id, f.title);
  }

  return Array.from(speakerMap.entries())
    .filter(([id]) => speakerIdSet.has(id))
    .map(([id, info]) => {
      const views = speakerViews.get(id);
      const subs = speakerSubs.get(id) ?? 0;
      const fanflets = speakerFanflets.get(id) ?? [];
      const uniques = views?.uniqueHashes.size ?? 0;

      let topFanfletTitle: string | null = null;
      let topViews = 0;
      for (const fid of fanflets) {
        const fViews = fanfletViews.get(fid) ?? 0;
        if (fViews > topViews) {
          topViews = fViews;
          topFanfletTitle = fanfletTitles.get(fid) ?? null;
        }
      }

      return {
        id,
        name: info.name,
        email: info.email,
        fanfletCount: fanflets.length,
        totalViews: views?.total ?? 0,
        totalSubscribers: subs,
        conversionRate: uniques > 0 ? (subs / uniques) * 100 : 0,
        topFanfletTitle,
      };
    })
    .filter((s) => s.totalViews > 0 || s.totalSubscribers > 0)
    .sort((a, b) => b.totalViews - a.totalViews);
}

/* ------------------------------------------------------------------ */
/*  Resource Type Performance                                          */
/* ------------------------------------------------------------------ */

export async function getResourceTypePerformance(range?: DateRange): Promise<ResourceTypePerformance[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data: clickEvents } = await supabase
    .from("analytics_events")
    .select("resource_block_id")
    .eq("event_type", "resource_click")
    .neq("is_bot", true)
    .not("resource_block_id", "is", null)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const clicksByBlock: Record<string, number> = {};
  for (const ev of clickEvents ?? []) {
    if (ev.resource_block_id) {
      clicksByBlock[ev.resource_block_id] = (clicksByBlock[ev.resource_block_id] ?? 0) + 1;
    }
  }

  const { data: allBlocks } = await supabase
    .from("resource_blocks")
    .select("id, type")
    .in("fanflet_id", fanfletIds);

  const byType: Record<string, { totalClicks: number; blockCount: number }> = {};
  for (const block of allBlocks ?? []) {
    if (!byType[block.type]) byType[block.type] = { totalClicks: 0, blockCount: 0 };
    byType[block.type].blockCount++;
    byType[block.type].totalClicks += clicksByBlock[block.id] ?? 0;
  }

  return Object.entries(byType)
    .map(([type, data]) => ({
      type,
      totalClicks: data.totalClicks,
      avgClicksPerBlock: data.blockCount > 0 ? data.totalClicks / data.blockCount : 0,
      blockCount: data.blockCount,
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks);
}

/* ------------------------------------------------------------------ */
/*  Growth Metrics                                                     */
/* ------------------------------------------------------------------ */

export async function getGrowthMetrics(range?: DateRange): Promise<{
  speakers: GrowthPoint[];
  fanflets: GrowthPoint[];
  subscribers: GrowthPoint[];
}> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(90);
  const validSpeakerIds = speakerIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL);
  const validFanfletIds = fanfletIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL);

  const [speakersResult, fanfletsResult, subsResult] = await Promise.all([
    validSpeakerIds.length === 0
      ? { data: [] as { created_at: string }[] }
      : supabase
          .from("speakers")
          .select("created_at")
          .in("id", validSpeakerIds)
          .gte("created_at", r.from)
          .lte("created_at", r.to)
          .order("created_at"),
    validFanfletIds.length === 0
      ? { data: [] as { created_at: string }[] }
      : supabase
          .from("fanflets")
          .select("created_at")
          .in("id", validFanfletIds)
          .gte("created_at", r.from)
          .lte("created_at", r.to)
          .order("created_at"),
    supabase
      .from("subscribers")
      .select("created_at")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to)
      .order("created_at"),
  ]);

  function aggregate(items: { created_at: string }[]): GrowthPoint[] {
    const byDate: Record<string, number> = {};
    for (const item of items) {
      const key = toDateKey(item.created_at);
      byDate[key] = (byDate[key] ?? 0) + 1;
    }
    const fromDate = new Date(r.from);
    const toDate = new Date(r.to);
    const points: GrowthPoint[] = [];
    const current = new Date(fromDate);
    current.setHours(0, 0, 0, 0);
    while (current <= toDate) {
      const key = current.toISOString().split("T")[0];
      points.push({ date: key, count: byDate[key] ?? 0 });
      current.setDate(current.getDate() + 1);
    }
    return points;
  }

  return {
    speakers: aggregate(speakersResult.data ?? []),
    fanflets: aggregate(fanfletsResult.data ?? []),
    subscribers: aggregate(subsResult.data ?? []),
  };
}

/* ------------------------------------------------------------------ */
/*  Activation Rate                                                    */
/* ------------------------------------------------------------------ */

export async function getActivationRate(): Promise<{ totalSpeakers: number; activatedSpeakers: number; rate: number }> {
  const supabase = createServiceClient();
  const { fanfletIds, speakerIds } = await getNonDemoScope(supabase);
  const validSpeakerIds = speakerIds.filter((id) => id !== EMPTY_FANFLET_SENTINEL);
  if (validSpeakerIds.length === 0) {
    return { totalSpeakers: 0, activatedSpeakers: 0, rate: 0 };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [speakersResult, fanfletsResult] = await Promise.all([
    supabase.from("speakers").select("id, created_at").in("id", validSpeakerIds).gte("created_at", thirtyDaysAgo),
    supabase.from("fanflets").select("speaker_id").eq("status", "published").in("id", fanfletIds),
  ]);

  const publishedSpeakers = new Set((fanfletsResult.data ?? []).map((f) => f.speaker_id));
  const speakers = speakersResult.data ?? [];
  const activated = speakers.filter((s) => publishedSpeakers.has(s.id)).length;

  return {
    totalSpeakers: speakers.length,
    activatedSpeakers: activated,
    rate: speakers.length > 0 ? (activated / speakers.length) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Geographic Breakdown                                               */
/* ------------------------------------------------------------------ */

export async function getGeoBreakdown(range?: DateRange): Promise<GeoBreakdown[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data } = await supabase
    .from("analytics_events")
    .select("country_code, city")
    .eq("event_type", "page_view")
    .neq("is_bot", true)
    .not("country_code", "is", null)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const counts: Record<string, { countryCode: string; city: string | null; count: number }> = {};
  for (const row of data ?? []) {
    const key = `${row.country_code}|${row.city ?? ""}`;
    if (!counts[key]) {
      counts[key] = { countryCode: row.country_code!, city: row.city, count: 0 };
    }
    counts[key].count++;
  }

  return Object.values(counts).sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/*  Bot vs Human Summary                                               */
/* ------------------------------------------------------------------ */

export async function getBotVsHumanSummary(range?: DateRange): Promise<BotVsHumanSummary> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const [totalResult, botResult] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("is_bot", true)
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
  ]);

  const totalEvents = totalResult.count ?? 0;
  const botEvents = botResult.count ?? 0;
  const humanEvents = totalEvents - botEvents;

  return {
    totalEvents,
    botEvents,
    humanEvents,
    botPercent: totalEvents > 0 ? (botEvents / totalEvents) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Top Referring Domains                                              */
/* ------------------------------------------------------------------ */

export async function getTopReferrerDomains(range?: DateRange, limit = 15): Promise<ReferrerDetail[]> {
  const supabase = createServiceClient();
  const { fanfletIds } = await getNonDemoScope(supabase);
  const r = range ?? defaultRange(30);

  const { data } = await supabase
    .from("analytics_events")
    .select("referrer, referrer_category")
    .eq("event_type", "page_view")
    .neq("is_bot", true)
    .not("referrer", "is", null)
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  const counts: Record<string, { category: string; count: number }> = {};
  for (const row of data ?? []) {
    if (!row.referrer) continue;
    const domain = extractDomain(row.referrer);
    const cat = row.referrer_category
      ? (REFERRER_CATEGORY_LABELS[row.referrer_category] ?? row.referrer_category)
      : classifyReferrer(row.referrer);
    if (!counts[domain]) counts[domain] = { category: cat, count: 0 };
    counts[domain].count++;
  }

  return Object.entries(counts)
    .map(([domain, { category, count }]) => ({ domain, category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
