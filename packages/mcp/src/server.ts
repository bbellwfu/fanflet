import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerToolsForRole } from "./tools/index";
import type { ToolContext, McpRole } from "./types";
import { McpEntitlementError } from "./types";

const MCP_ACCESS_FEATURE = "mcp_access";

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

  // Entitlement gate: speakers must have mcp_access (Pro plan or higher).
  // Admin and sponsor roles are not gated here (admin always has access;
  // sponsor entitlements will be added when the sponsor portal launches).
  if (ctx.role === "speaker" && ctx.entitlements) {
    if (!ctx.entitlements.features.has(MCP_ACCESS_FEATURE)) {
      throw new McpEntitlementError(
        `MCP access requires a Pro or Enterprise subscription. ` +
        `Your current plan: ${ctx.entitlements.planDisplayName ?? "Free"}. ` +
        `Upgrade at https://fanflet.com/pricing`
      );
    }
  }

  const server = new McpServer({
    name: "fanflet",
    version: "0.1.0",
  });

  registerToolsForRole(server, ctx);

  return server;
}
