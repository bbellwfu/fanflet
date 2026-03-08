import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminListSubscribers(
  serviceClient: SupabaseClient,
  input: {
    search?: string;
    sourceFanfletId?: string;
    limit: number;
    offset: number;
  }
) {
  let query = serviceClient
    .from("subscribers")
    .select(
      "id, email, name, created_at, speaker_id, source_fanflet_id, speakers(name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.search) {
    query = query.or(
      `email.ilike.%${input.search}%,name.ilike.%${input.search}%`
    );
  }

  if (input.sourceFanfletId) {
    query = query.eq("source_fanflet_id", input.sourceFanfletId);
  }

  const { data, count, error } = await query;
  if (error) throw new McpToolError("Failed to fetch subscribers");

  const subscribers = (data ?? []).map((s) => {
    const speaker = s.speakers as unknown as {
      name: string;
      email: string;
    } | null;
    return {
      id: s.id,
      email: s.email,
      name: s.name,
      createdAt: s.created_at,
      speakerId: s.speaker_id,
      sourceFanfletId: s.source_fanflet_id,
      speakerName: speaker?.name ?? "Unknown",
    };
  });

  return { subscribers, total: count ?? 0 };
}

export async function adminSubscriberStats(serviceClient: SupabaseClient) {
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [totalResult, weekResult, fanfletResult] = await Promise.all([
    serviceClient
      .from("subscribers")
      .select("id", { count: "exact", head: true }),
    serviceClient
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo),
    serviceClient
      .from("subscribers")
      .select("source_fanflet_id"),
  ]);

  const sourceCounts: Record<string, number> = {};
  for (const s of fanfletResult.data ?? []) {
    const fid = s.source_fanflet_id ?? "unknown";
    sourceCounts[fid] = (sourceCounts[fid] ?? 0) + 1;
  }

  return {
    total: totalResult.count ?? 0,
    thisWeek: weekResult.count ?? 0,
    sourceFanfletCount: Object.keys(sourceCounts).length,
    bySource: Object.entries(sourceCounts)
      .map(([fanfletId, count]) => ({ fanfletId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  };
}
