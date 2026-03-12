import type { SupabaseClient } from "@supabase/supabase-js";
import { getNonDemoScope } from "./analytics";

export async function adminPlatformOverview(serviceClient: SupabaseClient) {
  const { fanfletIds, speakerIds } = await getNonDemoScope(serviceClient);

  const [
    speakersResult,
    fanfletsResult,
    subscribersResult,
    pageViewsResult,
    recentSignupsResult,
    activeFanfletsResult,
  ] = await Promise.all([
    serviceClient.from("speakers").select("id", { count: "exact", head: true }).in("id", speakerIds),
    serviceClient.from("fanflets").select("id, status", { count: "exact" }).in("id", fanfletIds),
    serviceClient
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .in("speaker_id", speakerIds),
    serviceClient
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .in("fanflet_id", fanfletIds),
    serviceClient
      .from("speakers")
      .select("id", { count: "exact", head: true })
      .in("id", speakerIds)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
    serviceClient
      .from("analytics_events")
      .select("fanflet_id", { count: "exact", head: true })
      .in("fanflet_id", fanfletIds)
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  const fanflets = fanfletsResult.data ?? [];

  return {
    speakers: speakersResult.count ?? 0,
    fanflets: fanfletsResult.count ?? 0,
    publishedFanflets: fanflets.filter((f) => f.status === "published").length,
    draftFanflets: fanflets.filter((f) => f.status === "draft").length,
    subscribers: subscribersResult.count ?? 0,
    pageViews: pageViewsResult.count ?? 0,
    recentSignups30d: recentSignupsResult.count ?? 0,
    activeFanflets7d: activeFanfletsResult.count ?? 0,
  };
}

export async function adminRecentSignups(
  serviceClient: SupabaseClient,
  limit: number
) {
  const { speakerIds } = await getNonDemoScope(serviceClient);
  const { data, error } = await serviceClient
    .from("speakers")
    .select("id, name, email, created_at, status")
    .in("id", speakerIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Failed to fetch recent signups");
  return data ?? [];
}

export async function adminRecentFanflets(
  serviceClient: SupabaseClient,
  limit: number
) {
  const { fanfletIds } = await getNonDemoScope(serviceClient);
  const { data, error } = await serviceClient
    .from("fanflets")
    .select(
      "id, title, slug, status, published_at, speaker_id, speakers(name)"
    )
    .eq("status", "published")
    .in("id", fanfletIds)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Failed to fetch recent fanflets");

  return (data ?? []).map((f) => {
    const speaker = f.speakers as unknown as { name: string } | null;
    return {
      id: f.id,
      title: f.title,
      slug: f.slug,
      publishedAt: f.published_at,
      speakerName: speaker?.name ?? "Unknown",
    };
  });
}
