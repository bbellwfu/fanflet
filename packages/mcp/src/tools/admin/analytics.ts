import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange } from "../../types";

const EMPTY_SENTINEL = "00000000-0000-0000-0000-000000000000";

export async function getNonDemoScope(serviceClient: SupabaseClient): Promise<{ fanfletIds: string[]; speakerIds: string[] }> {
  const { data: speakers } = await serviceClient
    .from("speakers")
    .select("id")
    .neq("is_demo", true);
  const speakerIds = (speakers ?? []).map((s) => s.id);
  if (speakerIds.length === 0) {
    return { fanfletIds: [EMPTY_SENTINEL], speakerIds: [EMPTY_SENTINEL] };
  }
  const { data: fanflets } = await serviceClient
    .from("fanflets")
    .select("id")
    .in("speaker_id", speakerIds);
  const fanfletIds = (fanflets ?? []).map((f) => f.id);
  if (fanfletIds.length === 0) {
    return { fanfletIds: [EMPTY_SENTINEL], speakerIds };
  }
  return { fanfletIds, speakerIds };
}

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

function toDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

export async function adminPlatformKpis(
  serviceClient: SupabaseClient,
  range?: DateRange
) {
  const { fanfletIds, speakerIds } = await getNonDemoScope(serviceClient);
  const r = range ?? defaultRange(30);
  const prev = prevRange(r);

  const [viewsRes, clicksRes, subsRes, qrRes, prevViewsRes, prevClicksRes, prevSubsRes] =
    await Promise.all([
      serviceClient
        .from("analytics_events")
        .select("visitor_hash")
        .eq("event_type", "page_view")
        .in("fanflet_id", fanfletIds)
        .gte("created_at", r.from)
        .lte("created_at", r.to),
      serviceClient
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "resource_click")
        .in("fanflet_id", fanfletIds)
        .gte("created_at", r.from)
        .lte("created_at", r.to),
      serviceClient
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .in("speaker_id", speakerIds)
        .gte("created_at", r.from)
        .lte("created_at", r.to),
      serviceClient
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "qr_scan")
        .in("fanflet_id", fanfletIds)
        .gte("created_at", r.from)
        .lte("created_at", r.to),
      serviceClient
        .from("analytics_events")
        .select("visitor_hash")
        .eq("event_type", "page_view")
        .in("fanflet_id", fanfletIds)
        .gte("created_at", prev.from)
        .lte("created_at", prev.to),
      serviceClient
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "resource_click")
        .in("fanflet_id", fanfletIds)
        .gte("created_at", prev.from)
        .lte("created_at", prev.to),
      serviceClient
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .in("speaker_id", speakerIds)
        .gte("created_at", prev.from)
        .lte("created_at", prev.to),
    ]);

  const viewData = viewsRes.data ?? [];
  const uniqueHashes = new Set(viewData.map((e) => e.visitor_hash).filter(Boolean));
  const totalPageViews = viewData.length;
  const uniqueVisitors = uniqueHashes.size;
  const totalSubscribers = subsRes.count ?? 0;
  const totalResourceClicks = clicksRes.count ?? 0;

  const prevViewData = prevViewsRes.data ?? [];
  const prevUniques = new Set(prevViewData.map((e) => e.visitor_hash).filter(Boolean));

  return {
    totalPageViews,
    uniqueVisitors,
    totalSubscribers,
    conversionRate: uniqueVisitors > 0 ? +(totalSubscribers / uniqueVisitors * 100).toFixed(2) : 0,
    totalResourceClicks,
    qrAdoptionRate: totalPageViews > 0 ? +(((qrRes.count ?? 0) / totalPageViews) * 100).toFixed(2) : 0,
    prevPageViews: prevViewData.length,
    prevUniqueVisitors: prevUniques.size,
    prevSubscribers: prevSubsRes.count ?? 0,
    prevResourceClicks: prevClicksRes.count ?? 0,
    dateRange: r,
  };
}

export async function adminPlatformTimeseries(
  serviceClient: SupabaseClient,
  range?: DateRange
) {
  const { fanfletIds, speakerIds } = await getNonDemoScope(serviceClient);
  const r = range ?? defaultRange(60);

  const [eventsRes, subsRes] = await Promise.all([
    serviceClient
      .from("analytics_events")
      .select("event_type, visitor_hash, created_at")
      .in("event_type", ["page_view", "resource_click"])
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to)
      .order("created_at"),
    serviceClient
      .from("subscribers")
      .select("created_at")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
  ]);

  const byDate: Record<string, { views: number; uniqueHashes: Set<string>; clicks: number; subs: number }> = {};

  for (const ev of eventsRes.data ?? []) {
    const key = toDateKey(ev.created_at);
    if (!byDate[key]) byDate[key] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
    if (ev.event_type === "page_view") {
      byDate[key].views++;
      if (ev.visitor_hash) byDate[key].uniqueHashes.add(ev.visitor_hash);
    } else {
      byDate[key].clicks++;
    }
  }

  for (const sub of subsRes.data ?? []) {
    const key = toDateKey(sub.created_at);
    if (!byDate[key]) byDate[key] = { views: 0, uniqueHashes: new Set(), clicks: 0, subs: 0 };
    byDate[key].subs++;
  }

  const fromDate = new Date(r.from);
  const toDate = new Date(r.to);
  const result: { date: string; pageViews: number; uniqueVisitors: number; subscribers: number; resourceClicks: number }[] = [];
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

export async function adminTopFanflets(
  serviceClient: SupabaseClient,
  range?: DateRange,
  limit = 10
) {
  const { fanfletIds, speakerIds } = await getNonDemoScope(serviceClient);
  const r = range ?? defaultRange(30);

  const [eventsRes, subsRes, fanfletsRes] = await Promise.all([
    serviceClient
      .from("analytics_events")
      .select("fanflet_id, event_type, visitor_hash")
      .in("event_type", ["page_view", "resource_click"])
      .in("fanflet_id", fanfletIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    serviceClient
      .from("subscribers")
      .select("source_fanflet_id")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to),
    serviceClient
      .from("fanflets")
      .select("id, title, speaker_id, speakers(name)")
      .eq("status", "published")
      .in("id", fanfletIds),
  ]);

  const fanfletMap = new Map<string, { title: string; speakerName: string }>();
  for (const f of fanfletsRes.data ?? []) {
    const speaker = f.speakers as unknown as { name: string } | null;
    fanfletMap.set(f.id, { title: f.title, speakerName: speaker?.name ?? "Unknown" });
  }

  const fanfletIdSet = new Set(fanfletIds.filter((id) => id !== EMPTY_SENTINEL));
  const stats: Record<string, { views: number; uniqueHashes: Set<string>; clicks: number; subs: number }> = {};

  for (const ev of eventsRes.data ?? []) {
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

  for (const sub of subsRes.data ?? []) {
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
        conversionRate: uniques > 0 ? +(s.subs / uniques * 100).toFixed(2) : 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export async function adminGrowthMetrics(
  serviceClient: SupabaseClient,
  range?: DateRange
) {
  const { fanfletIds, speakerIds } = await getNonDemoScope(serviceClient);
  const r = range ?? defaultRange(90);
  const validSpeakerIds = speakerIds.filter((id) => id !== EMPTY_SENTINEL);
  const validFanfletIds = fanfletIds.filter((id) => id !== EMPTY_SENTINEL);

  const [speakersRes, fanfletsRes, subsRes] = await Promise.all([
    validSpeakerIds.length === 0
      ? { data: [] as { created_at: string }[] }
      : serviceClient
          .from("speakers")
          .select("created_at")
          .in("id", validSpeakerIds)
          .gte("created_at", r.from)
          .lte("created_at", r.to)
          .order("created_at"),
    validFanfletIds.length === 0
      ? { data: [] as { created_at: string }[] }
      : serviceClient
          .from("fanflets")
          .select("created_at")
          .in("id", validFanfletIds)
          .gte("created_at", r.from)
          .lte("created_at", r.to)
          .order("created_at"),
    serviceClient
      .from("subscribers")
      .select("created_at")
      .in("speaker_id", speakerIds)
      .gte("created_at", r.from)
      .lte("created_at", r.to)
      .order("created_at"),
  ]);

  function aggregate(items: { created_at: string }[]) {
    const byDate: Record<string, number> = {};
    for (const item of items) {
      const key = toDateKey(item.created_at);
      byDate[key] = (byDate[key] ?? 0) + 1;
    }
    const fromDate = new Date(r.from);
    const toDate = new Date(r.to);
    const points: { date: string; count: number }[] = [];
    const cur = new Date(fromDate);
    cur.setHours(0, 0, 0, 0);
    while (cur <= toDate) {
      const key = cur.toISOString().split("T")[0];
      points.push({ date: key, count: byDate[key] ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return points;
  }

  return {
    speakers: aggregate(speakersRes.data ?? []),
    fanflets: aggregate(fanfletsRes.data ?? []),
    subscribers: aggregate(subsRes.data ?? []),
  };
}
