import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminListFanflets(
  serviceClient: SupabaseClient,
  input: {
    status?: string;
    search?: string;
    limit: number;
    offset: number;
  }
) {
  let query = serviceClient
    .from("fanflets")
    .select(
      "id, title, slug, status, published_at, created_at, speaker_id, speakers(name, email, slug)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  if (input.search) {
    query = query.ilike("title", `%${input.search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new McpToolError("Failed to fetch fanflets");

  const fanflets = (data ?? []).map((f) => {
    const speaker = f.speakers as unknown as {
      name: string;
      email: string;
      slug: string | null;
    } | null;
    return {
      id: f.id,
      title: f.title,
      slug: f.slug,
      status: f.status,
      publishedAt: f.published_at,
      createdAt: f.created_at,
      speakerId: f.speaker_id,
      speakerName: speaker?.name ?? "Unknown",
      speakerEmail: speaker?.email ?? "Unknown",
    };
  });

  return { fanflets, total: count ?? 0 };
}

export async function adminGetFanflet(
  serviceClient: SupabaseClient,
  fanfletId: string
) {
  const { data, error } = await serviceClient
    .from("fanflets")
    .select(
      `*, speakers(name, email, slug),
       resource_blocks(id, type, title, description, url, display_order, section_name)`
    )
    .eq("id", fanfletId)
    .single();

  if (error || !data) throw new McpToolError("Fanflet not found");

  const speaker = data.speakers as unknown as {
    name: string;
    email: string;
    slug: string | null;
  } | null;

  return {
    ...data,
    speakerName: speaker?.name ?? "Unknown",
    speakerEmail: speaker?.email ?? "Unknown",
  };
}
