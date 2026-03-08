import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../../types";
import { wrapTool } from "../shared";

/**
 * Registers all speaker tools.
 *
 * Speaker tools use ctx.supabase (RLS-scoped to the authenticated user).
 * All tool names are prefixed with `speaker_` by convention.
 *
 * ## Supabase client usage
 * - ctx.supabase — user-scoped client (RLS enforced, auth.uid() = speaker's auth user)
 * - NEVER use ctx.serviceClient in speaker tools
 *
 * ## Adding a new speaker tool
 * 1. Create a handler file (e.g., `fanflets.ts`) with pure async functions
 * 2. Import and register here using `server.tool()` + `wrapTool()`
 * 3. Use `ctx.supabase` for all queries — RLS handles data isolation
 *
 * @see packages/mcp/README.md for the full pattern guide.
 */
export function registerSpeakerTools(server: McpServer, ctx: ToolContext) {
  if (ctx.role !== "speaker") return;

  const db = ctx.supabase;

  // ── Profile ──
  server.tool(
    "speaker_get_profile",
    "Get the authenticated speaker's profile (name, bio, slug, photo URL)",
    {},
    wrapTool(ctx, "speaker_get_profile", async () => {
      const { data, error } = await db
        .from("speakers")
        .select("id, name, email, bio, slug, photo_url, social_links, created_at")
        .single();
      if (error) throw new Error("Failed to fetch profile");
      return data;
    })
  );

  // ── Fanflets ──
  server.tool(
    "speaker_list_fanflets",
    "List all fanflets owned by the authenticated speaker",
    {
      status: z.enum(["draft", "published", "archived", "all"]).optional()
        .describe("Filter by status"),
      limit: z.number().int().min(1).max(50).default(20)
        .describe("Max results"),
      offset: z.number().int().min(0).default(0)
        .describe("Pagination offset"),
    },
    wrapTool(ctx, "speaker_list_fanflets", async (input) => {
      let query = db
        .from("fanflets")
        .select("id, title, slug, status, event_name, published_at, created_at, updated_at", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(
          (input.offset as number) ?? 0,
          ((input.offset as number) ?? 0) + ((input.limit as number) ?? 20) - 1
        );

      if (input.status && input.status !== "all") {
        query = query.eq("status", input.status as string);
      }

      const { data, count, error } = await query;
      if (error) throw new Error("Failed to fetch fanflets");
      return { fanflets: data ?? [], total: count ?? 0 };
    })
  );

  server.tool(
    "speaker_get_plan_info",
    "Get the authenticated speaker's current plan, limits, and features",
    {},
    wrapTool(ctx, "speaker_get_plan_info", async () => {
      const { data: sub } = await db
        .from("speaker_subscriptions")
        .select("*, plans(name, display_name)")
        .maybeSingle();

      if (!sub) {
        return { plan: "free", limits: { max_fanflets: 5, max_resources_per_fanflet: 20 }, features: [] };
      }

      return {
        plan: (sub.plans as unknown as { name: string })?.name ?? "unknown",
        planDisplayName: (sub.plans as unknown as { display_name: string })?.display_name,
        limits: sub.limits_snapshot,
        features: sub.features_snapshot,
      };
    })
  );

  // TODO: Add remaining speaker tools per PRDs/MCP_INTEGRATION_VISION.md Phase 1-2:
  // - speaker_get_fanflet
  // - speaker_create_fanflet
  // - speaker_publish_fanflet / speaker_unpublish_fanflet
  // - speaker_add_resource_block / speaker_delete_resource_block
  // - speaker_get_subscriber_count
  // - speaker_list_subscribers
  // - speaker_get_fanflet_analytics (Pro-gated)
  // - speaker_list_library_resources
  // - speaker_update_speaker_profile
}
