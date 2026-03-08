import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../../types";
import { wrapTool } from "../shared";

/**
 * Registers all sponsor tools.
 *
 * Sponsor tools use ctx.supabase (RLS-scoped to the authenticated user).
 * All tool names are prefixed with `sponsor_` by convention.
 *
 * ## Prerequisites
 * - Sponsor portal UI must be at least partially built
 * - sponsor_accounts, sponsor_connections, sponsor_resources tables exist (schema ready)
 *
 * ## Supabase client usage
 * - ctx.supabase — user-scoped client (RLS enforced)
 * - NEVER use ctx.serviceClient in sponsor tools
 *
 * @see packages/mcp/README.md for the full pattern guide.
 * @see PRDs/MCP_INTEGRATION_VISION.md Phase 3 for the full sponsor tool inventory.
 */
export function registerSponsorTools(server: McpServer, ctx: ToolContext) {
  if (ctx.role !== "sponsor") return;

  const db = ctx.supabase;

  // ── Profile ──
  server.tool(
    "sponsor_get_profile",
    "Get the authenticated sponsor's company profile",
    {},
    wrapTool(ctx, "sponsor_get_profile", async () => {
      const { data, error } = await db
        .from("sponsor_accounts")
        .select("id, company_name, slug, contact_email, industry, logo_url, website, is_verified, created_at")
        .single();
      if (error) throw new Error("Failed to fetch sponsor profile");
      return data;
    })
  );

  // ── Connections ──
  server.tool(
    "sponsor_list_connections",
    "List all speaker connections for the authenticated sponsor",
    {
      status: z.enum(["pending", "active", "declined", "revoked", "all"]).optional()
        .describe("Filter by connection status"),
    },
    wrapTool(ctx, "sponsor_list_connections", async (input) => {
      let query = db
        .from("sponsor_connections")
        .select("id, speaker_id, status, initiated_by, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (input.status && input.status !== "all") {
        query = query.eq("status", input.status as string);
      }

      const { data, error } = await query;
      if (error) throw new Error("Failed to fetch connections");
      return data ?? [];
    })
  );

  server.tool(
    "sponsor_list_resources",
    "List all resources created by the authenticated sponsor",
    {
      status: z.enum(["active", "paused", "retired", "all"]).optional()
        .describe("Filter by resource status"),
    },
    wrapTool(ctx, "sponsor_list_resources", async (input) => {
      let query = db
        .from("sponsor_resources")
        .select("id, title, type, status, url, expires_at, created_at")
        .order("created_at", { ascending: false });

      if (input.status && input.status !== "all") {
        query = query.eq("status", input.status as string);
      }

      const { data, error } = await query;
      if (error) throw new Error("Failed to fetch resources");
      return data ?? [];
    })
  );

  // TODO: Add remaining sponsor tools per PRDs/MCP_INTEGRATION_VISION.md Phase 3:
  // - sponsor_update_profile
  // - sponsor_create_resource / sponsor_update_resource / sponsor_update_resource_status
  // - sponsor_send_connection_request / sponsor_respond_to_connection
  // - sponsor_browse_speakers
  // - sponsor_get_resource_placements (Pro-gated)
  // - sponsor_get_leads (Pro-gated)
  // - sponsor_get_resource_analytics (Pro-gated)
}
