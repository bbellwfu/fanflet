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

  server.tool(
    "sponsor_get_analytics",
    "Get detailed analytics for the authenticated sponsor, including KPIs, fanflet performance, and resource type engagement.",
    {
      range: z.enum(["7d", "30d", "90d", "365d"]).optional().default("30d"),
      speakerId: z.string().optional().describe("Filter by a specific speaker ID"),
      campaignId: z.string().optional().describe("Filter by a specific campaign ID"),
    },
    wrapTool(ctx, "sponsor_get_analytics", async (input) => {
      const { data: sponsor } = await db
        .from("sponsor_accounts")
        .select("id")
        .single();
      if (!sponsor) throw new Error("Sponsor account not found");

      // 1. Resolve Range
      const now = new Date();
      const fromDate = new Date();
      const rangeStr = (input as any).range as string;
      const days = parseInt(rangeStr.replace("d", ""), 10);
      fromDate.setDate(now.getDate() - days);
      const dateRange = { from: fromDate.toISOString(), to: now.toISOString() };

      // 2. Resolve Scope
      const [connectionsRes, campaignsRes] = await Promise.all([
        db.from("sponsor_connections").select("speaker_id").eq("sponsor_id", sponsor.id).eq("status", "active"),
        db.from("sponsor_campaigns").select("id, name, all_speakers_assigned").eq("sponsor_id", sponsor.id),
      ]);

      let availableSpeakerIds = (connectionsRes.data ?? []).map(c => c.speaker_id);
      const availableCampaigns = campaignsRes.data ?? [];

      if (input.campaignId) {
        const selectedCampaign = availableCampaigns.find(c => c.id === input.campaignId);
        if (selectedCampaign && !selectedCampaign.all_speakers_assigned) {
          const { data: kolRes } = await db.from("sponsor_campaign_kols").select("speaker_id").eq("campaign_id", input.campaignId);
          const campaignKOLs = (kolRes ?? []).map(k => k.speaker_id);
          availableSpeakerIds = availableSpeakerIds.filter(id => campaignKOLs.includes(id));
        }
      }

      if (input.speakerId) {
        availableSpeakerIds = availableSpeakerIds.includes(input.speakerId) ? [input.speakerId] : [];
      }

      if (availableSpeakerIds.length === 0) return { message: "No speakers found", stats: [] };

      // 3. Resolve fanflets and blocks
      const { data: fanflets } = await db.from("fanflets").select("id").in("speaker_id", availableSpeakerIds);
      if (!fanflets || fanflets.length === 0) return { message: "No fanflets found", stats: [] };
      const fanfletIds = fanflets.map(f => f.id);

      let blockQuery = db.from("resource_blocks").select("id").eq("sponsor_account_id", sponsor.id).in("fanflet_id", fanfletIds);
      if (input.campaignId) {
        const { data: rc } = await db.from("sponsor_resource_campaigns").select("resource_id").eq("campaign_id", input.campaignId);
        const libIds = (rc ?? []).map(r => r.resource_id);
        if (libIds.length > 0) blockQuery = blockQuery.in("sponsor_library_item_id", libIds);
      }

      const { data: blocks } = await blockQuery;
      const blockIds = (blocks ?? []).map(b => b.id);

      if (blockIds.length === 0) return { message: "No resources found", stats: [] };

      // 4. Fetch rich analytics from Core
      const { getSponsorKPIs, getSponsorFanfletPerformance, getSponsorResourceTypePerformance } = await import("@fanflet/core");

      const [kpiRes, fanfletPerfRes, resourceTypePerfRes] = await Promise.all([
        getSponsorKPIs(db, sponsor.id, fanfletIds, blockIds, dateRange),
        getSponsorFanfletPerformance(db, sponsor.id, fanfletIds, blockIds, dateRange),
        getSponsorResourceTypePerformance(db, sponsor.id, blockIds, dateRange)
      ]);

      return {
        kpis: kpiRes.data,
        fanfletPerformance: fanfletPerfRes.data,
        resourceTypePerformance: resourceTypePerfRes.data
      };
    })
  );
}
