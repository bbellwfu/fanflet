import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../../types";
import { wrapTool } from "../shared";

/**
 * Registers all audience tools.
 *
 * Audience tools provide read access for attendees who registered for
 * a fanflet (entered their email). These tools let audience members
 * access resources, bookmarks, and survey responses through their AI
 * agent after authenticating with the same email they used to subscribe.
 *
 * ## Supabase client usage
 * - ctx.supabase — user-scoped client (RLS enforced)
 * - NEVER use ctx.serviceClient in audience tools
 *
 * ## RLS strategy
 * Audience tools query subscribers and related data scoped to the
 * authenticated user's email. The user must have a corresponding
 * entry in the subscribers table to access fanflet resources.
 *
 * @see packages/mcp/README.md for the full pattern guide.
 */
export function registerAudienceTools(server: McpServer, ctx: ToolContext) {
  if (ctx.role !== "audience") return;

  const db = ctx.supabase;

  // ── Subscriptions ──
  server.tool(
    "audience_list_subscriptions",
    "List all fanflets the audience member has subscribed to",
    {},
    wrapTool(ctx, "audience_list_subscriptions", async () => {
      const { data, error } = await db
        .from("subscribers")
        .select(`
          id, created_at, source_fanflet_id,
          fanflets:source_fanflet_id(id, title, slug, event_name, speakers(name, slug))
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error("Failed to fetch subscriptions");
      return data ?? [];
    })
  );

  // ── Resources ──
  server.tool(
    "audience_get_fanflet_resources",
    "Get all resources from a fanflet the audience member subscribed to",
    {
      fanfletId: z.string().uuid().describe("Fanflet UUID"),
    },
    wrapTool(ctx, "audience_get_fanflet_resources", async (input) => {
      const { data: fanflet, error } = await db
        .from("fanflets")
        .select(`
          id, title, slug, event_name,
          speakers(name, slug),
          resource_blocks(id, type, title, description, url, display_order, section_name)
        `)
        .eq("id", input.fanfletId as string)
        .eq("status", "published")
        .single();

      if (error || !fanflet) throw new Error("Fanflet not found or not published");
      return fanflet;
    })
  );

  // TODO: Add remaining audience tools:
  // - audience_get_sms_bookmarks — list SMS-bookmarked fanflets
  // - audience_get_survey_responses — view submitted survey responses
  // - audience_search_resources — search across subscribed fanflets
}
