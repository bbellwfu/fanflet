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
