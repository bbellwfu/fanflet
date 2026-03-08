import type { UserScopedClient, SpeakerEntitlements, ServiceResult } from "./types";
import { ok, err } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FanfletAnalytics {
  fanfletId: string;
  pageViews: number;
  uniqueVisitors: number;
  resourceClicks: number;
  emailSignups: number;
  qrScans: number;
  smsBookmarks: number;
  /** Page views grouped by attribution source (direct, qr, portfolio, share). */
  pageViewsBySource: Record<string, number>;
}

export interface ResourceRanking {
  resourceBlockId: string;
  title: string;
  type: string;
  clicks: number;
}

export interface DashboardOverview {
  totalFanflets: number;
  publishedFanflets: number;
  totalSubscribers: number;
  totalPageViews: number;
  totalResourceClicks: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface SpeakerKPIs {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSubscribers: number;
  conversionRate: number;
  totalResourceClicks: number;
  qrScans: number;
  prevPageViews: number;
  prevUniqueVisitors: number;
  prevSubscribers: number;
  prevResourceClicks: number;
}

export interface DeviceBreakdown {
  device: string;
  count: number;
}

export interface ReferrerBreakdown {
  category: string;
  count: number;
}

export interface ResourceTypePerformance {
  type: string;
  totalClicks: number;
  avgClicksPerBlock: number;
  blockCount: number;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface ConversionFunnelStep {
  step: string;
  count: number;
  dropOffPercent: number;
}

/* ------------------------------------------------------------------ */
/*  Service functions                                                  */
/* ------------------------------------------------------------------ */

export async function getDashboardOverview(
  supabase: UserScopedClient,
  speakerId: string
): Promise<ServiceResult<DashboardOverview>> {
  const [fanfletResult, subscriberResult, viewResult, clickResult] = await Promise.all([
    supabase
      .from("fanflets")
      .select("id, status", { count: "exact" })
      .eq("speaker_id", speakerId),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speakerId),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .in(
        "fanflet_id",
        (await supabase.from("fanflets").select("id").eq("speaker_id", speakerId)).data?.map(
          (f) => f.id
        ) ?? []
      ),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "resource_click")
      .in(
        "fanflet_id",
        (await supabase.from("fanflets").select("id").eq("speaker_id", speakerId)).data?.map(
          (f) => f.id
        ) ?? []
      ),
  ]);

  const fanflets = fanfletResult.data ?? [];
  return ok({
    totalFanflets: fanflets.length,
    publishedFanflets: fanflets.filter((f) => f.status === "published").length,
    totalSubscribers: subscriberResult.count ?? 0,
    totalPageViews: viewResult.count ?? 0,
    totalResourceClicks: clickResult.count ?? 0,
  });
}

export async function getFanfletAnalytics(
  supabase: UserScopedClient,
  fanfletId: string,
  entitlements: SpeakerEntitlements
): Promise<ServiceResult<FanfletAnalytics>> {
  if (!entitlements.features.has("basic_engagement_stats")) {
    return err("upgrade_required", "Analytics require a higher plan.", {
      feature: "basic_engagement_stats",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const eventTypes = ["page_view", "resource_click", "email_signup", "qr_scan", "sms_bookmark"] as const;

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("event_type, visitor_hash, source")
    .eq("fanflet_id", fanfletId)
    .in("event_type", [...eventTypes]);

  if (error) return err("internal_error", error.message);

  const counts: Record<string, number> = {};
  const pageViewsBySource: Record<string, number> = {};
  const uniqueVisitors = new Set<string>();

  for (const ev of events ?? []) {
    counts[ev.event_type] = (counts[ev.event_type] ?? 0) + 1;
    if (ev.event_type === "page_view") {
      if (ev.visitor_hash) uniqueVisitors.add(ev.visitor_hash);
      const source = (ev as { source?: string | null }).source ?? "direct";
      pageViewsBySource[source] = (pageViewsBySource[source] ?? 0) + 1;
    }
  }

  return ok({
    fanfletId,
    pageViews: counts["page_view"] ?? 0,
    uniqueVisitors: uniqueVisitors.size,
    resourceClicks: counts["resource_click"] ?? 0,
    emailSignups: counts["email_signup"] ?? 0,
    qrScans: counts["qr_scan"] ?? 0,
    smsBookmarks: counts["sms_bookmark"] ?? 0,
    pageViewsBySource,
  });
}

export async function getResourceRankings(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  options?: { fanfletId?: string; limit?: number }
): Promise<ServiceResult<ResourceRanking[]>> {
  if (!entitlements.features.has("click_through_analytics")) {
    return err("upgrade_required", "Resource rankings require a Pro plan.", {
      feature: "click_through_analytics",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const { data: fanfletIds } = await supabase
    .from("fanflets")
    .select("id")
    .eq("speaker_id", speakerId);

  if (!fanfletIds || fanfletIds.length === 0) return ok([]);

  const targetFanfletIds = options?.fanfletId
    ? [options.fanfletId]
    : fanfletIds.map((f) => f.id);

  const { data: clicks, error } = await supabase
    .from("analytics_events")
    .select("resource_block_id")
    .eq("event_type", "resource_click")
    .in("fanflet_id", targetFanfletIds)
    .not("resource_block_id", "is", null);

  if (error) return err("internal_error", error.message);

  const clickCounts: Record<string, number> = {};
  for (const c of clicks ?? []) {
    if (c.resource_block_id) {
      clickCounts[c.resource_block_id] = (clickCounts[c.resource_block_id] ?? 0) + 1;
    }
  }

  const blockIds = Object.keys(clickCounts);
  if (blockIds.length === 0) return ok([]);

  const { data: blocks } = await supabase
    .from("resource_blocks")
    .select("id, title, type")
    .in("id", blockIds);

  const rankings: ResourceRanking[] = (blocks ?? [])
    .map((b) => ({
      resourceBlockId: b.id,
      title: b.title ?? "Untitled",
      type: b.type,
      clicks: clickCounts[b.id] ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, options?.limit ?? 20);

  return ok(rankings);
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
  return "Other";
}

async function getSpeakerFanfletIds(
  supabase: UserScopedClient,
  speakerId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("fanflets")
    .select("id")
    .eq("speaker_id", speakerId);
  return (data ?? []).map((f) => f.id);
}

/* ------------------------------------------------------------------ */
/*  Speaker KPIs (Pro)                                                 */
/* ------------------------------------------------------------------ */

export async function getSpeakerKPIs(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<SpeakerKPIs>> {
  if (!entitlements.features.has("click_through_analytics")) {
    return err("upgrade_required", "Advanced KPIs require a Pro plan.", {
      feature: "click_through_analytics",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) {
    return ok({
      totalPageViews: 0, uniqueVisitors: 0, totalSubscribers: 0,
      conversionRate: 0, totalResourceClicks: 0, qrScans: 0,
      prevPageViews: 0, prevUniqueVisitors: 0, prevSubscribers: 0, prevResourceClicks: 0,
    });
  }

  const r = range ?? defaultRange(30);
  const prev = prevRange(r);

  const [viewsResult, clicksResult, subsResult, qrResult, prevViewsResult, prevClicksResult, prevSubsResult] =
    await Promise.all([
      supabase.from("analytics_events").select("visitor_hash")
        .eq("event_type", "page_view").in("fanflet_id", fanfletIds)
        .gte("created_at", r.from).lte("created_at", r.to),
      supabase.from("analytics_events").select("id", { count: "exact", head: true })
        .eq("event_type", "resource_click").in("fanflet_id", fanfletIds)
        .gte("created_at", r.from).lte("created_at", r.to),
      supabase.from("subscribers").select("id", { count: "exact", head: true })
        .eq("speaker_id", speakerId)
        .gte("created_at", r.from).lte("created_at", r.to),
      supabase.from("analytics_events").select("id", { count: "exact", head: true })
        .eq("event_type", "qr_scan").in("fanflet_id", fanfletIds)
        .gte("created_at", r.from).lte("created_at", r.to),
      supabase.from("analytics_events").select("visitor_hash")
        .eq("event_type", "page_view").in("fanflet_id", fanfletIds)
        .gte("created_at", prev.from).lte("created_at", prev.to),
      supabase.from("analytics_events").select("id", { count: "exact", head: true })
        .eq("event_type", "resource_click").in("fanflet_id", fanfletIds)
        .gte("created_at", prev.from).lte("created_at", prev.to),
      supabase.from("subscribers").select("id", { count: "exact", head: true })
        .eq("speaker_id", speakerId)
        .gte("created_at", prev.from).lte("created_at", prev.to),
    ]);

  const viewData = viewsResult.data ?? [];
  const uniqueHashes = new Set(viewData.map((e) => e.visitor_hash).filter(Boolean));
  const totalPageViews = viewData.length;
  const uniqueVisitors = uniqueHashes.size;
  const totalSubscribers = subsResult.count ?? 0;

  const prevViewData = prevViewsResult.data ?? [];
  const prevUniqueHashes = new Set(prevViewData.map((e) => e.visitor_hash).filter(Boolean));

  return ok({
    totalPageViews,
    uniqueVisitors,
    totalSubscribers,
    conversionRate: uniqueVisitors > 0 ? (totalSubscribers / uniqueVisitors) * 100 : 0,
    totalResourceClicks: clicksResult.count ?? 0,
    qrScans: qrResult.count ?? 0,
    prevPageViews: prevViewData.length,
    prevUniqueVisitors: prevUniqueHashes.size,
    prevSubscribers: prevSubsResult.count ?? 0,
    prevResourceClicks: prevClicksResult.count ?? 0,
  });
}

/* ------------------------------------------------------------------ */
/*  Device Breakdown (Pro)                                             */
/* ------------------------------------------------------------------ */

export async function getSpeakerDeviceBreakdown(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<DeviceBreakdown[]>> {
  if (!entitlements.features.has("click_through_analytics")) {
    return err("upgrade_required", "Device analytics require a Pro plan.", {
      feature: "click_through_analytics",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) return ok([]);

  const r = range ?? defaultRange(30);
  const { data, error } = await supabase
    .from("analytics_events")
    .select("device_type")
    .eq("event_type", "page_view")
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  if (error) return err("internal_error", error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const device = row.device_type || "unknown";
    counts[device] = (counts[device] ?? 0) + 1;
  }

  return ok(
    Object.entries(counts)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)
  );
}

/* ------------------------------------------------------------------ */
/*  Referrer Breakdown (Pro)                                           */
/* ------------------------------------------------------------------ */

export async function getSpeakerReferrerBreakdown(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<ReferrerBreakdown[]>> {
  if (!entitlements.features.has("click_through_analytics")) {
    return err("upgrade_required", "Traffic source analytics require a Pro plan.", {
      feature: "click_through_analytics",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) return ok([]);

  const r = range ?? defaultRange(30);
  const { data, error } = await supabase
    .from("analytics_events")
    .select("referrer, source")
    .eq("event_type", "page_view")
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  if (error) return err("internal_error", error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const src = (row as { source?: string | null }).source;
    let category: string;
    if (src === "qr") category = "QR Code";
    else if (src === "portfolio") category = "Portfolio";
    else if (src === "share") category = "Share Link";
    else category = classifyReferrer(row.referrer);
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return ok(
    Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  );
}

/* ------------------------------------------------------------------ */
/*  Resource Type Performance (Pro)                                    */
/* ------------------------------------------------------------------ */

export async function getSpeakerResourceTypePerformance(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<ResourceTypePerformance[]>> {
  if (!entitlements.features.has("click_through_analytics")) {
    return err("upgrade_required", "Resource type analytics require a Pro plan.", {
      feature: "click_through_analytics",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) return ok([]);

  const r = range ?? defaultRange(30);

  const [clickResult, blocksResult] = await Promise.all([
    supabase.from("analytics_events").select("resource_block_id")
      .eq("event_type", "resource_click").in("fanflet_id", fanfletIds)
      .not("resource_block_id", "is", null)
      .gte("created_at", r.from).lte("created_at", r.to),
    supabase.from("resource_blocks").select("id, type").in("fanflet_id", fanfletIds),
  ]);

  if (clickResult.error) return err("internal_error", clickResult.error.message);

  const clicksByBlock: Record<string, number> = {};
  for (const ev of clickResult.data ?? []) {
    if (ev.resource_block_id) {
      clicksByBlock[ev.resource_block_id] = (clicksByBlock[ev.resource_block_id] ?? 0) + 1;
    }
  }

  const byType: Record<string, { totalClicks: number; blockCount: number }> = {};
  for (const block of blocksResult.data ?? []) {
    if (!byType[block.type]) byType[block.type] = { totalClicks: 0, blockCount: 0 };
    byType[block.type].blockCount++;
    byType[block.type].totalClicks += clicksByBlock[block.id] ?? 0;
  }

  return ok(
    Object.entries(byType)
      .map(([type, d]) => ({
        type,
        totalClicks: d.totalClicks,
        avgClicksPerBlock: d.blockCount > 0 ? d.totalClicks / d.blockCount : 0,
        blockCount: d.blockCount,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks)
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Heatmap (Enterprise)                                      */
/* ------------------------------------------------------------------ */

export async function getSpeakerActivityHeatmap(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<HeatmapCell[]>> {
  if (!entitlements.features.has("advanced_reporting")) {
    return err("upgrade_required", "Activity heatmap requires an Enterprise plan.", {
      feature: "advanced_reporting",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) {
    const empty: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        empty.push({ dayOfWeek: day, hour, count: 0 });
      }
    }
    return ok(empty);
  }

  const r = range ?? defaultRange(30);
  const { data, error } = await supabase
    .from("analytics_events")
    .select("created_at")
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to);

  if (error) return err("internal_error", error.message);

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
  return ok(cells);
}

/* ------------------------------------------------------------------ */
/*  Conversion Funnel (Enterprise)                                     */
/* ------------------------------------------------------------------ */

export async function getSpeakerConversionFunnel(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<ConversionFunnelStep[]>> {
  if (!entitlements.features.has("advanced_reporting")) {
    return err("upgrade_required", "Conversion funnel requires an Enterprise plan.", {
      feature: "advanced_reporting",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) {
    return ok([
      { step: "QR Scans", count: 0, dropOffPercent: 0 },
      { step: "Page Views", count: 0, dropOffPercent: 0 },
      { step: "Resource Clicks", count: 0, dropOffPercent: 0 },
      { step: "Email Signups", count: 0, dropOffPercent: 0 },
    ]);
  }

  const r = range ?? defaultRange(30);
  const [qrResult, viewResult, clickResult, signupResult] = await Promise.all([
    supabase.from("analytics_events").select("id", { count: "exact", head: true })
      .eq("event_type", "qr_scan").in("fanflet_id", fanfletIds)
      .gte("created_at", r.from).lte("created_at", r.to),
    supabase.from("analytics_events").select("id", { count: "exact", head: true })
      .eq("event_type", "page_view").in("fanflet_id", fanfletIds)
      .gte("created_at", r.from).lte("created_at", r.to),
    supabase.from("analytics_events").select("id", { count: "exact", head: true })
      .eq("event_type", "resource_click").in("fanflet_id", fanfletIds)
      .gte("created_at", r.from).lte("created_at", r.to),
    supabase.from("analytics_events").select("id", { count: "exact", head: true })
      .eq("event_type", "email_signup").in("fanflet_id", fanfletIds)
      .gte("created_at", r.from).lte("created_at", r.to),
  ]);

  const steps = [
    { step: "QR Scans", count: qrResult.count ?? 0 },
    { step: "Page Views", count: viewResult.count ?? 0 },
    { step: "Resource Clicks", count: clickResult.count ?? 0 },
    { step: "Email Signups", count: signupResult.count ?? 0 },
  ];

  const topCount = Math.max(...steps.map((s) => s.count), 1);
  return ok(
    steps.map((s, i) => ({
      ...s,
      dropOffPercent: i === 0
        ? 0
        : steps[i - 1].count > 0
          ? ((steps[i - 1].count - s.count) / steps[i - 1].count) * 100
          : 0,
    }))
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Export (Enterprise)                                            */
/* ------------------------------------------------------------------ */

export async function exportSpeakerAnalyticsCSV(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  range?: DateRange
): Promise<ServiceResult<string>> {
  if (!entitlements.features.has("advanced_reporting")) {
    return err("upgrade_required", "CSV export requires an Enterprise plan.", {
      feature: "advanced_reporting",
      currentPlan: entitlements.planName ?? undefined,
    });
  }

  const fanfletIds = await getSpeakerFanfletIds(supabase, speakerId);
  if (fanfletIds.length === 0) return ok("date,event_type,fanflet_id,device_type,source\n");

  const r = range ?? defaultRange(30);
  const { data, error } = await supabase
    .from("analytics_events")
    .select("created_at, event_type, fanflet_id, device_type, source")
    .in("fanflet_id", fanfletIds)
    .gte("created_at", r.from)
    .lte("created_at", r.to)
    .order("created_at", { ascending: false });

  if (error) return err("internal_error", error.message);

  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id, title")
    .in("id", fanfletIds);
  const titleMap = new Map((fanflets ?? []).map((f) => [f.id, f.title]));

  const rows = ["date,event_type,fanflet,device_type,source"];
  for (const ev of data ?? []) {
    const date = new Date(ev.created_at).toISOString().split("T")[0];
    const title = (titleMap.get(ev.fanflet_id) ?? "").replace(/,/g, ";");
    rows.push(`${date},${ev.event_type},${title},${ev.device_type ?? ""},${(ev as { source?: string | null }).source ?? ""}`);
  }

  return ok(rows.join("\n"));
}
