import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../../types";
import { wrapTool } from "../shared";
import {
  createFanflet as coreCreateFanflet,
  publishFanflet as corePublishFanflet,
  unpublishFanflet as coreUnpublishFanflet,
  getFanflet as coreGetFanflet,
  addResourceBlock as coreAddResourceBlock,
  deleteResourceBlock as coreDeleteResourceBlock,
  getSubscriberCount as coreGetSubscriberCount,
} from "@fanflet/core";

/**
 * Registers all speaker tools.
 *
 * Speaker tools use ctx.supabase (RLS-scoped to the authenticated user).
 * All tool names are prefixed with `speaker_` by convention.
 *
 * ## Entitlement model
 * MCP is a delivery channel, not a gated feature. All speakers (including Free)
 * can use MCP. Per-tool gating is handled via:
 * - `requiredFeature` — blocks tools behind a feature flag (e.g. analytics)
 * - `checkLimits` — enforces plan limits (e.g. max_fanflets)
 *
 * ## Supabase client usage
 * - ctx.supabase — user-scoped client (RLS enforced, auth.uid() = speaker's auth user)
 * - NEVER use ctx.serviceClient in speaker tools
 *
 * @see packages/mcp/README.md for the full pattern guide.
 * @see PRDs/MCP_INTEGRATION_VISION.md for the CRUD matrix.
 */
export function registerSpeakerTools(server: McpServer, ctx: ToolContext) {
  if (ctx.role !== "speaker") return;

  const db = ctx.supabase;
  const speakerId = ctx.speakerId;
  if (!speakerId) return;

  const entitlements = ctx.entitlements ?? {
    features: new Set<string>(),
    limits: { max_fanflets: 5, max_resources_per_fanflet: 20 },
    planName: "free",
    planDisplayName: "Free",
  };

  // ── Profile ──────────────────────────────────────────────────────────

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

  // ── Plan Info ────────────────────────────────────────────────────────

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

  // ── Fanflets (Read) ─────────────────────────────────────────────────

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
    "speaker_get_fanflet",
    "Get a single fanflet with all its resource blocks",
    {
      fanfletId: z.string().uuid().describe("Fanflet UUID"),
    },
    wrapTool(ctx, "speaker_get_fanflet", async (input) => {
      const result = await coreGetFanflet(db, input.fanfletId as string);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    })
  );

  // ── Fanflets (Write) ────────────────────────────────────────────────

  server.tool(
    "speaker_create_fanflet",
    "Create a new fanflet (draft status). Enforces plan limit on max fanflets.",
    {
      title: z.string().min(1).max(200).describe("Fanflet title"),
      slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/)
        .describe("URL slug (lowercase, hyphens, no spaces)"),
      eventName: z.string().max(200).optional()
        .describe("Event or conference name"),
      eventDate: z.string().optional()
        .describe("Event date (ISO 8601 date string)"),
    },
    wrapTool(
      ctx,
      "speaker_create_fanflet",
      async (input) => {
        const result = await coreCreateFanflet(db, speakerId, entitlements, {
          title: input.title as string,
          slug: input.slug as string,
          event_name: (input.eventName as string) ?? "",
          event_date: (input.eventDate as string) ?? null,
        });

        if (result.error) throw new Error(result.error.message);
        return result.data;
      },
      {
        checkLimits: async () => {
          const maxFanflets = entitlements.limits.max_fanflets;
          if (typeof maxFanflets !== "number" || maxFanflets === -1) return null;

          const { count, error } = await db
            .from("fanflets")
            .select("id", { count: "exact", head: true })
            .eq("speaker_id", speakerId);

          if (error) return "Could not check fanflet limit";
          if ((count ?? 0) >= maxFanflets) {
            return `You've reached the limit of ${maxFanflets} Fanflets on your ${entitlements.planDisplayName ?? "Free"} plan. Upgrade at https://fanflet.com/pricing`;
          }
          return null;
        },
      }
    )
  );

  server.tool(
    "speaker_publish_fanflet",
    "Publish a draft fanflet, making it accessible via its public URL",
    {
      fanfletId: z.string().uuid().describe("Fanflet UUID to publish"),
    },
    wrapTool(ctx, "speaker_publish_fanflet", async (input) => {
      const result = await corePublishFanflet(
        db,
        speakerId,
        input.fanfletId as string
      );
      if (result.error) throw new Error(result.error.message);
      return { published: true, firstPublished: result.data?.firstPublished };
    })
  );

  server.tool(
    "speaker_unpublish_fanflet",
    "Unpublish a fanflet, reverting it to draft status",
    {
      fanfletId: z.string().uuid().describe("Fanflet UUID to unpublish"),
    },
    wrapTool(ctx, "speaker_unpublish_fanflet", async (input) => {
      const result = await coreUnpublishFanflet(db, input.fanfletId as string);
      if (result.error) throw new Error(result.error.message);
      return { unpublished: true };
    })
  );

  // ── Resource Blocks ─────────────────────────────────────────────────

  server.tool(
    "speaker_add_resource_block",
    "Add a resource block (link, text, or sponsor) to a fanflet. Enforces plan limit on resources per fanflet.",
    {
      fanfletId: z.string().uuid().describe("Target fanflet UUID"),
      type: z.enum(["link", "text", "sponsor"]).describe("Block type"),
      title: z.string().max(200).optional().describe("Block title"),
      url: z.string().max(2000).optional().describe("URL for link blocks"),
      description: z.string().max(2000).optional().describe("Block description or text content"),
    },
    wrapTool(
      ctx,
      "speaker_add_resource_block",
      async (input) => {
        const result = await coreAddResourceBlock(
          db,
          speakerId,
          input.fanfletId as string,
          entitlements,
          {
            type: input.type as string,
            title: input.title as string | undefined,
            url: input.url as string | undefined,
            description: input.description as string | undefined,
          }
        );
        if (result.error) throw new Error(result.error.message);
        return result.data;
      },
      {
        checkLimits: async (_ctx, input) => {
          const maxResources = entitlements.limits.max_resources_per_fanflet;
          if (typeof maxResources !== "number" || maxResources === -1) return null;

          const { count, error } = await db
            .from("resource_blocks")
            .select("id", { count: "exact", head: true })
            .eq("fanflet_id", input.fanfletId as string);

          if (error) return "Could not check resource limit";
          if ((count ?? 0) >= maxResources) {
            return `You've reached the limit of ${maxResources} resources per fanflet on your ${entitlements.planDisplayName ?? "Free"} plan. Upgrade at https://fanflet.com/pricing`;
          }
          return null;
        },
      }
    )
  );

  server.tool(
    "speaker_delete_resource_block",
    "Delete a resource block from a fanflet",
    {
      blockId: z.string().uuid().describe("Resource block UUID to delete"),
    },
    wrapTool(ctx, "speaker_delete_resource_block", async (input) => {
      const result = await coreDeleteResourceBlock(db, input.blockId as string);
      if (result.error) throw new Error(result.error.message);
      return { deleted: true, fanfletId: result.data?.fanfletId };
    })
  );

  // ── Subscribers ─────────────────────────────────────────────────────

  server.tool(
    "speaker_get_subscriber_count",
    "Get total subscriber count and per-fanflet breakdown",
    {},
    wrapTool(ctx, "speaker_get_subscriber_count", async () => {
      const totalResult = await coreGetSubscriberCount(db, speakerId);
      if (totalResult.error) throw new Error(totalResult.error.message);

      const { data: fanflets } = await db
        .from("fanflets")
        .select("id, title, slug")
        .order("updated_at", { ascending: false });

      const perFanflet: Array<{ fanfletId: string; title: string; slug: string; count: number }> = [];
      for (const f of fanflets ?? []) {
        const r = await coreGetSubscriberCount(db, speakerId, f.id);
        if (r.data) {
          perFanflet.push({
            fanfletId: f.id,
            title: f.title,
            slug: f.slug,
            count: r.data.total,
          });
        }
      }

      return {
        total: totalResult.data?.total ?? 0,
        perFanflet,
      };
    })
  );
}
