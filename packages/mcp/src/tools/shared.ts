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

/**
 * Wraps a raw tool handler with rate limiting, audit logging, and
 * structured MCP responses. Use this for every tool in every role.
 *
 * @example
 * ```ts
 * server.tool(
 *   "speaker_list_fanflets",
 *   "List all fanflets for the authenticated speaker",
 *   { limit: z.number().default(20) },
 *   wrapTool(ctx, "speaker_list_fanflets", async (input) => {
 *     return listFanflets(ctx.supabase, input.limit as number);
 *   })
 * );
 * ```
 */
export function wrapTool(
  ctx: ToolContext,
  toolName: string,
  handler: ToolHandler
) {
  return async (input: Record<string, unknown>) => {
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
