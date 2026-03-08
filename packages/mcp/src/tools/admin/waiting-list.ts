import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminListWaitingList(
  serviceClient: SupabaseClient,
  input: {
    tier?: string;
    search?: string;
    limit: number;
    offset: number;
  }
) {
  let query = serviceClient
    .from("marketing_subscribers")
    .select("id, email, source, interest_tier, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.tier && input.tier !== "all") {
    if (input.tier === "none") {
      query = query.is("interest_tier", null);
    } else {
      query = query.eq("interest_tier", input.tier);
    }
  }

  if (input.search) {
    query = query.ilike("email", `%${input.search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new McpToolError("Failed to fetch waiting list");

  return { subscribers: data ?? [], total: count ?? 0 };
}

export async function adminWaitingListStats(serviceClient: SupabaseClient) {
  const { data, count, error } = await serviceClient
    .from("marketing_subscribers")
    .select("interest_tier", { count: "exact" });

  if (error) throw new McpToolError("Failed to fetch waiting list stats");

  const byTier: Record<string, number> = {};
  for (const s of data ?? []) {
    const tier = s.interest_tier ?? "none";
    byTier[tier] = (byTier[tier] ?? 0) + 1;
  }

  return {
    total: count ?? 0,
    byTier: Object.entries(byTier)
      .map(([tier, tierCount]) => ({ tier, count: tierCount }))
      .sort((a, b) => b.count - a.count),
  };
}
