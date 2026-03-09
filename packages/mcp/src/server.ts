import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerToolsForRole } from "./tools/index";
import type { ToolContext, McpRole } from "./types";

export interface McpServerOptions {
  /**
   * Restrict which roles this server instance handles.
   * If omitted, all roles are eligible (dispatched by the authenticated user's role).
   *
   * Use this to separate admin tools (in apps/admin/) from speaker/sponsor/audience
   * tools (in apps/web/):
   *
   * ```ts
   * // apps/admin/app/api/mcp/route.ts
   * createMcpServer(ctx, { allowedRoles: ["platform_admin"] });
   *
   * // apps/web/app/api/mcp/route.ts
   * createMcpServer(ctx, { allowedRoles: ["speaker", "sponsor", "audience"] });
   * ```
   */
  allowedRoles?: McpRole[];
}

/**
 * Creates an MCP server for the authenticated user. MCP is treated as a
 * delivery channel — not a gated product feature. All authenticated users
 * get access; individual tools enforce their own entitlement checks via
 * `wrapTool({ requiredFeature, checkLimits })`.
 */
export function createMcpServer(
  ctx: ToolContext,
  options?: McpServerOptions
): McpServer {
  if (options?.allowedRoles && !options.allowedRoles.includes(ctx.role)) {
    throw new Error(
      `Role "${ctx.role}" is not allowed on this MCP endpoint. ` +
      `Allowed roles: ${options.allowedRoles.join(", ")}`
    );
  }

  const server = new McpServer({
    name: "fanflet",
    version: "0.1.0",
  });

  registerToolsForRole(server, ctx);

  return server;
}
