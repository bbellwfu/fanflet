/**
 * Shared tool utilities for all role modules.
 *
 * Every role module (admin, speaker, sponsor, audience) uses the same
 * wrapTool() helper to get consistent audit logging, rate limiting,
 * and error handling. This is the canonical pattern to follow when
 * adding tools for a new role.
 *
 * ## Adding tools for a new role
 *
 * 1. Create `tools/{role}/index.ts` exporting `register{Role}Tools(server, ctx)`
 * 2. Create handler files in `tools/{role}/` (e.g., `fanflets.ts`, `profile.ts`)
 * 3. In the index, call `server.tool(name, description, schema, wrapTool(ctx, name, handler))`
 * 4. Register in `tools/index.ts` by adding the role to the registry
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../types";
import { writeAuditLog } from "../middleware/audit";
import { checkRateLimit } from "../middleware/rate-limit";

export type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

/**
 * Standard function signature for a role's tool registration.
 * Every role module must export a function matching this type.
 */
export type RegisterToolsFn = (server: McpServer, ctx: ToolContext) => void;

export interface WrapToolOptions {
  /**
   * Feature flag key required to use this tool. If set and the user's
   * entitlements don't include this feature, the tool returns a structured
   * upgrade prompt instead of executing.
   *
   * Checks speaker entitlements for speaker role and sponsor entitlements
   * for sponsor role. Admin tools are never gated.
   */
  requiredFeature?: string;

  /**
   * Async callback to enforce plan limits before executing the tool.
   * Return `null` if the limit is OK, or an error message string if
   * the limit is exceeded. Called after the feature check and before
   * the handler.
   */
  checkLimits?: (ctx: ToolContext, input: Record<string, unknown>) => Promise<string | null>;
}

/**
 * Wraps a raw tool handler with entitlement checks, rate limiting, audit
 * logging, and structured MCP responses. Use this for every tool in every role.
 *
 * @example
 * ```ts
 * server.tool(
 *   "speaker_get_fanflet_analytics",
 *   "Get analytics for a specific fanflet",
 *   { fanfletId: z.string().uuid() },
 *   wrapTool(ctx, "speaker_get_fanflet_analytics", handler, {
 *     requiredFeature: "click_through_analytics",
 *   })
 * );
 * ```
 */
export function wrapTool(
  ctx: ToolContext,
  toolName: string,
  handler: ToolHandler,
  options?: WrapToolOptions
) {
  return async (input: Record<string, unknown>) => {
    // Per-tool feature flag check (speakers and sponsors)
    if (options?.requiredFeature) {
      const speakerFeatures = ctx.entitlements?.features;
      const sponsorFeatures = ctx.sponsorEntitlements?.features;
      const features = speakerFeatures ?? sponsorFeatures;
      const planName =
        ctx.entitlements?.planDisplayName ??
        ctx.sponsorEntitlements?.planDisplayName ??
        "Free";

      if (features && !features.has(options.requiredFeature)) {
        await writeAuditLog(ctx, toolName, input, "denied", 0);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "feature_not_available",
                message: `This tool requires the "${options.requiredFeature}" feature, which is not included in your ${planName} plan. Upgrade at https://fanflet.com/pricing`,
                current_plan: planName,
                required_feature: options.requiredFeature,
              }),
            },
          ],
          isError: true,
        };
      }
    }

    // Per-tool limit check (e.g. max_fanflets, max_resources_per_fanflet)
    if (options?.checkLimits) {
      const limitError = await options.checkLimits(ctx, input);
      if (limitError) {
        await writeAuditLog(ctx, toolName, input, "denied", 0);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "limit_reached",
                message: limitError,
                current_plan:
                  ctx.entitlements?.planDisplayName ??
                  ctx.sponsorEntitlements?.planDisplayName ??
                  "Free",
              }),
            },
          ],
          isError: true,
        };
      }
    }

    checkRateLimit(ctx);
    const start = Date.now();
    try {
      const result = await handler(input);
      await writeAuditLog(
        ctx,
        toolName,
        input,
        "success",
        Date.now() - start
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await writeAuditLog(
        ctx,
        toolName,
        input,
        "error",
        Date.now() - start,
        message
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ error: message }) },
        ],
        isError: true,
      };
    }
  };
}
