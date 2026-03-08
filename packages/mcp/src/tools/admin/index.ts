import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../../types";
import { McpToolError } from "../../types";
import { writeAuditLog } from "../../middleware/audit";
import { checkRateLimit } from "../../middleware/rate-limit";

import {
  adminPlatformOverview,
  adminRecentSignups,
  adminRecentFanflets,
} from "./overview";
import {
  adminListAccounts,
  adminGetAccount,
  adminSuspendAccount,
  adminReactivateAccount,
  adminResetAccount,
  adminChangeSpeakerPlan,
  adminLookupSpeaker,
} from "./accounts";
import {
  adminListSponsors,
  adminGetSponsor,
  adminToggleSponsorVerification,
} from "./sponsors";
import { adminListFanflets, adminGetFanflet } from "./fanflets";
import { adminListSubscribers, adminSubscriberStats } from "./subscribers";
import {
  adminPlatformKpis,
  adminPlatformTimeseries,
  adminTopFanflets,
  adminGrowthMetrics,
} from "./analytics";
import {
  adminListFeatures,
  adminToggleFeatureGlobal,
  adminListPlans,
  adminGetPlan,
  adminCreatePlan,
  adminUpdatePlan,
  adminRefreshEntitlements,
  adminOverrideSpeakerFeature,
} from "./features";
import {
  adminListWaitingList,
  adminWaitingListStats,
} from "./waiting-list";
import { adminGetSettings, adminUpdateSettings } from "./settings";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

function wrapTool(
  ctx: ToolContext,
  toolName: string,
  handler: ToolHandler
) {
  return async (input: Record<string, unknown>) => {
    checkRateLimit(ctx);
    const start = Date.now();
    try {
      const result = await handler(input);
      await writeAuditLog(ctx, toolName, input, "success", Date.now() - start);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await writeAuditLog(ctx, toolName, input, "error", Date.now() - start, message);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  };
}

export function registerAdminTools(server: McpServer, ctx: ToolContext) {
  if (ctx.role !== "platform_admin") return;

  const sc = ctx.serviceClient;

  // ── Platform Overview ──
  server.tool(
    "admin_platform_overview",
    "Get platform-wide stats: speakers, fanflets, subscribers, page views, recent signups, active fanflets",
    {},
    wrapTool(ctx, "admin_platform_overview", () => adminPlatformOverview(sc))
  );

  server.tool(
    "admin_recent_signups",
    "List the most recent speaker signups",
    { limit: z.number().int().min(1).max(50).default(10).describe("Max results to return") },
    wrapTool(ctx, "admin_recent_signups", (input) =>
      adminRecentSignups(sc, (input.limit as number) ?? 10)
    )
  );

  server.tool(
    "admin_recent_fanflets",
    "List recently published fanflets",
    { limit: z.number().int().min(1).max(50).default(10).describe("Max results to return") },
    wrapTool(ctx, "admin_recent_fanflets", (input) =>
      adminRecentFanflets(sc, (input.limit as number) ?? 10)
    )
  );

  // ── Account Management ──
  server.tool(
    "admin_list_accounts",
    "List speaker accounts with optional search, status filter, and date filter",
    {
      search: z.string().max(200).optional().describe("Search by name or email"),
      status: z.enum(["active", "suspended", "new", "all"]).optional().describe("Filter by account status"),
      createdSince: z.string().optional().describe("ISO date string — only show accounts created since this date"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    wrapTool(ctx, "admin_list_accounts", (input) =>
      adminListAccounts(sc, {
        search: input.search as string | undefined,
        status: input.status as string | undefined,
        createdSince: input.createdSince as string | undefined,
        limit: (input.limit as number) ?? 20,
        offset: (input.offset as number) ?? 0,
      })
    )
  );

  server.tool(
    "admin_get_account",
    "Get detailed account info including profile, fanflets, subscriber count, and plan",
    { speakerId: z.string().uuid().describe("Speaker UUID") },
    wrapTool(ctx, "admin_get_account", (input) =>
      adminGetAccount(sc, input.speakerId as string)
    )
  );

  server.tool(
    "admin_suspend_account",
    "Suspend a speaker account (prevents login and hides fanflets)",
    {
      speakerId: z.string().uuid().describe("Speaker UUID"),
      reason: z.string().max(500).optional().describe("Reason for suspension"),
    },
    wrapTool(ctx, "admin_suspend_account", (input) =>
      adminSuspendAccount(sc, ctx.userId, input.speakerId as string, input.reason as string | undefined)
    )
  );

  server.tool(
    "admin_reactivate_account",
    "Reactivate a suspended speaker account",
    { speakerId: z.string().uuid().describe("Speaker UUID") },
    wrapTool(ctx, "admin_reactivate_account", (input) =>
      adminReactivateAccount(sc, input.speakerId as string)
    )
  );

  server.tool(
    "admin_reset_account",
    "Reset a speaker account to new state (deletes all content). Requires confirmName matching the speaker's name.",
    {
      speakerId: z.string().uuid().describe("Speaker UUID"),
      confirmName: z.string().min(1).max(200).describe("Speaker's name — must match exactly for safety"),
    },
    wrapTool(ctx, "admin_reset_account", (input) =>
      adminResetAccount(sc, input.speakerId as string, input.confirmName as string)
    )
  );

  server.tool(
    "admin_change_speaker_plan",
    "Change a speaker's plan. Pass null for planId to move to Free.",
    {
      speakerId: z.string().uuid().describe("Speaker UUID"),
      planId: z.string().uuid().nullable().describe("Plan UUID, or null for Free plan"),
    },
    wrapTool(ctx, "admin_change_speaker_plan", (input) =>
      adminChangeSpeakerPlan(sc, input.speakerId as string, input.planId as string | null)
    )
  );

  server.tool(
    "admin_lookup_speaker",
    "Find a speaker by email address or slug",
    {
      email: z.string().email().optional().describe("Speaker email"),
      slug: z.string().max(200).optional().describe("Speaker slug"),
    },
    wrapTool(ctx, "admin_lookup_speaker", (input) =>
      adminLookupSpeaker(sc, {
        email: input.email as string | undefined,
        slug: input.slug as string | undefined,
      })
    )
  );

  // ── Sponsor Management ──
  server.tool(
    "admin_list_sponsors",
    "List sponsor accounts with optional search and verification filter",
    {
      search: z.string().max(200).optional().describe("Search by company name, email, or slug"),
      verificationStatus: z.enum(["verified", "unverified", "all"]).optional().describe("Filter by verification status"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    wrapTool(ctx, "admin_list_sponsors", (input) =>
      adminListSponsors(sc, {
        search: input.search as string | undefined,
        verificationStatus: input.verificationStatus as string | undefined,
        limit: (input.limit as number) ?? 20,
        offset: (input.offset as number) ?? 0,
      })
    )
  );

  server.tool(
    "admin_get_sponsor",
    "Get detailed sponsor info including connections, leads, and resources",
    { sponsorId: z.string().uuid().describe("Sponsor UUID") },
    wrapTool(ctx, "admin_get_sponsor", (input) =>
      adminGetSponsor(sc, input.sponsorId as string)
    )
  );

  server.tool(
    "admin_toggle_sponsor_verification",
    "Verify or unverify a sponsor account",
    {
      sponsorId: z.string().uuid().describe("Sponsor UUID"),
      verified: z.boolean().describe("Set to true to verify, false to unverify"),
    },
    wrapTool(ctx, "admin_toggle_sponsor_verification", (input) =>
      adminToggleSponsorVerification(sc, input.sponsorId as string, input.verified as boolean)
    )
  );

  // ── Fanflet Management ──
  server.tool(
    "admin_list_fanflets",
    "List all fanflets platform-wide with optional status and search filter",
    {
      status: z.enum(["published", "draft", "all"]).optional().describe("Filter by fanflet status"),
      search: z.string().max(200).optional().describe("Search by title"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    wrapTool(ctx, "admin_list_fanflets", (input) =>
      adminListFanflets(sc, {
        status: input.status as string | undefined,
        search: input.search as string | undefined,
        limit: (input.limit as number) ?? 20,
        offset: (input.offset as number) ?? 0,
      })
    )
  );

  server.tool(
    "admin_get_fanflet",
    "Get full fanflet details including blocks and speaker info",
    { fanfletId: z.string().uuid().describe("Fanflet UUID") },
    wrapTool(ctx, "admin_get_fanflet", (input) =>
      adminGetFanflet(sc, input.fanfletId as string)
    )
  );

  // ── Subscriber Management ──
  server.tool(
    "admin_list_subscribers",
    "List platform-wide email subscribers with search and source filter",
    {
      search: z.string().max(200).optional().describe("Search by email or name"),
      sourceFanfletId: z.string().uuid().optional().describe("Filter by source fanflet"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    wrapTool(ctx, "admin_list_subscribers", (input) =>
      adminListSubscribers(sc, {
        search: input.search as string | undefined,
        sourceFanfletId: input.sourceFanfletId as string | undefined,
        limit: (input.limit as number) ?? 20,
        offset: (input.offset as number) ?? 0,
      })
    )
  );

  server.tool(
    "admin_subscriber_stats",
    "Subscriber summary: total count, this week's signups, source breakdown",
    {},
    wrapTool(ctx, "admin_subscriber_stats", () => adminSubscriberStats(sc))
  );

  // ── Platform Analytics ──
  server.tool(
    "admin_platform_kpis",
    "Key performance indicators: page views, unique visitors, subscribers, resource clicks, conversion rate, QR adoption",
    {
      from: z.string().optional().describe("Start date (ISO string). Defaults to 30 days ago."),
      to: z.string().optional().describe("End date (ISO string). Defaults to now."),
    },
    wrapTool(ctx, "admin_platform_kpis", (input) => {
      const range = input.from && input.to ? { from: input.from as string, to: input.to as string } : undefined;
      return adminPlatformKpis(sc, range);
    })
  );

  server.tool(
    "admin_platform_timeseries",
    "Time series of page views, unique visitors, subscribers, and resource clicks by day",
    {
      from: z.string().optional().describe("Start date (ISO string). Defaults to 60 days ago."),
      to: z.string().optional().describe("End date (ISO string). Defaults to now."),
    },
    wrapTool(ctx, "admin_platform_timeseries", (input) => {
      const range = input.from && input.to ? { from: input.from as string, to: input.to as string } : undefined;
      return adminPlatformTimeseries(sc, range);
    })
  );

  server.tool(
    "admin_top_fanflets",
    "Top fanflets ranked by page views, with click and subscriber counts",
    {
      from: z.string().optional().describe("Start date (ISO string). Defaults to 30 days ago."),
      to: z.string().optional().describe("End date (ISO string). Defaults to now."),
      limit: z.number().int().min(1).max(50).default(10).describe("Max results"),
    },
    wrapTool(ctx, "admin_top_fanflets", (input) => {
      const range = input.from && input.to ? { from: input.from as string, to: input.to as string } : undefined;
      return adminTopFanflets(sc, range, (input.limit as number) ?? 10);
    })
  );

  server.tool(
    "admin_growth_metrics",
    "Growth trends: new speakers, fanflets, and subscribers over time",
    {
      from: z.string().optional().describe("Start date (ISO string). Defaults to 90 days ago."),
      to: z.string().optional().describe("End date (ISO string). Defaults to now."),
    },
    wrapTool(ctx, "admin_growth_metrics", (input) => {
      const range = input.from && input.to ? { from: input.from as string, to: input.to as string } : undefined;
      return adminGrowthMetrics(sc, range);
    })
  );

  // ── Features & Plans ──
  server.tool(
    "admin_list_features",
    "List all feature flags with global status and which plans include them",
    {},
    wrapTool(ctx, "admin_list_features", () => adminListFeatures(sc))
  );

  server.tool(
    "admin_toggle_feature_global",
    "Enable or disable a feature flag globally (for all users)",
    {
      featureFlagId: z.string().uuid().describe("Feature flag UUID"),
      isGlobal: z.boolean().describe("True to enable globally, false to disable"),
    },
    wrapTool(ctx, "admin_toggle_feature_global", (input) =>
      adminToggleFeatureGlobal(sc, input.featureFlagId as string, input.isGlobal as boolean)
    )
  );

  server.tool(
    "admin_list_plans",
    "List all plans with their features, limits, and active speaker count",
    {},
    wrapTool(ctx, "admin_list_plans", () => adminListPlans(sc))
  );

  server.tool(
    "admin_get_plan",
    "Get a single plan's full details including features and subscriber count",
    { planId: z.string().uuid().describe("Plan UUID") },
    wrapTool(ctx, "admin_get_plan", (input) =>
      adminGetPlan(sc, input.planId as string)
    )
  );

  server.tool(
    "admin_create_plan",
    "Create a new plan with limits and feature assignments",
    {
      name: z.string().min(1).max(100).describe("Plan key (lowercase, underscores)"),
      displayName: z.string().min(1).max(200).describe("Display name"),
      description: z.string().max(500).optional().describe("Plan description"),
      limits: z.record(z.string(), z.number()).describe("Plan limits (e.g. max_fanflets, storage_mb)"),
      featureFlagIds: z.array(z.string().uuid()).default([]).describe("Feature flag UUIDs to include"),
      isVisible: z.boolean().default(true).describe("Show on pricing page"),
      isActive: z.boolean().default(true).describe("Plan is active"),
    },
    wrapTool(ctx, "admin_create_plan", (input) =>
      adminCreatePlan(sc, input as Parameters<typeof adminCreatePlan>[1])
    )
  );

  server.tool(
    "admin_update_plan",
    "Update an existing plan's details, limits, and/or features",
    {
      planId: z.string().uuid().describe("Plan UUID"),
      displayName: z.string().max(200).optional().describe("New display name"),
      description: z.string().max(500).optional().describe("New description"),
      limits: z.record(z.string(), z.number()).optional().describe("Updated limits"),
      featureFlagIds: z.array(z.string().uuid()).optional().describe("Replace feature list"),
      isVisible: z.boolean().optional().describe("Show on pricing page"),
      isActive: z.boolean().optional().describe("Plan is active"),
    },
    wrapTool(ctx, "admin_update_plan", (input) => {
      const { planId, ...rest } = input;
      return adminUpdatePlan(sc, planId as string, rest as Parameters<typeof adminUpdatePlan>[2]);
    })
  );

  server.tool(
    "admin_refresh_entitlements",
    "Refresh entitlement snapshots for all active subscribers on a plan",
    { planId: z.string().uuid().describe("Plan UUID") },
    wrapTool(ctx, "admin_refresh_entitlements", (input) =>
      adminRefreshEntitlements(sc, input.planId as string)
    )
  );

  server.tool(
    "admin_override_speaker_feature",
    "Grant or revoke a specific feature flag override for a speaker",
    {
      speakerId: z.string().uuid().describe("Speaker UUID"),
      featureKey: z.string().min(1).max(100).describe("Feature flag key (e.g. 'click_through_analytics')"),
      enabled: z.boolean().describe("True to grant, false to revoke"),
    },
    wrapTool(ctx, "admin_override_speaker_feature", (input) =>
      adminOverrideSpeakerFeature(
        sc,
        input.speakerId as string,
        input.featureKey as string,
        input.enabled as boolean
      )
    )
  );

  // ── Waiting List ──
  server.tool(
    "admin_list_waiting_list",
    "List marketing subscribers (pricing page signups) with optional tier and search filter",
    {
      tier: z.string().optional().describe("Filter by interest tier (e.g. 'pro', 'enterprise', 'none', 'all')"),
      search: z.string().max(200).optional().describe("Search by email"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    wrapTool(ctx, "admin_list_waiting_list", (input) =>
      adminListWaitingList(sc, {
        tier: input.tier as string | undefined,
        search: input.search as string | undefined,
        limit: (input.limit as number) ?? 20,
        offset: (input.offset as number) ?? 0,
      })
    )
  );

  server.tool(
    "admin_waiting_list_stats",
    "Waiting list summary: total count and breakdown by interest tier",
    {},
    wrapTool(ctx, "admin_waiting_list_stats", () => adminWaitingListStats(sc))
  );

  // ── Settings ──
  server.tool(
    "admin_get_settings",
    "Get admin notification preferences and timezone",
    {},
    wrapTool(ctx, "admin_get_settings", () => adminGetSettings(sc, ctx.userId))
  );

  server.tool(
    "admin_update_settings",
    "Update admin notification preferences and/or timezone",
    {
      notifications: z.object({
        speaker_signup: z.boolean().optional(),
        sponsor_signup: z.boolean().optional(),
        fanflet_created: z.boolean().optional(),
        onboarding_completed: z.boolean().optional(),
      }).optional().describe("Notification preference updates"),
      timezone: z.string().max(100).optional().describe("IANA timezone identifier (e.g. 'America/New_York')"),
    },
    wrapTool(ctx, "admin_update_settings", (input) =>
      adminUpdateSettings(sc, ctx.userId, {
        notifications: input.notifications as Record<string, boolean> | undefined,
        timezone: input.timezone as string | undefined,
      })
    )
  );
}
