/**
 * MCP Tool Registry
 *
 * Routes tool registration to the appropriate role module based on
 * the authenticated user's role. Each role module follows the same
 * pattern — see tools/shared.ts for the contract.
 *
 * ## Adding a new role
 *
 * 1. Create `tools/{role}/index.ts` exporting a `register{Role}Tools` function
 * 2. Import it here
 * 3. Add the role to the registry map
 * 4. The server will automatically expose those tools when a user with
 *    that role authenticates
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext, McpRole } from "../types";
import type { RegisterToolsFn } from "./shared";

import { registerAdminTools } from "./admin/index";
import { registerSpeakerTools } from "./speaker/index";
import { registerSponsorTools } from "./sponsor/index";
import { registerAudienceTools } from "./audience/index";

const roleRegistry: Record<McpRole, RegisterToolsFn> = {
  platform_admin: registerAdminTools,
  speaker: registerSpeakerTools,
  sponsor: registerSponsorTools,
  audience: registerAudienceTools,
};

/**
 * Registers all tools appropriate for the authenticated user's role.
 *
 * - platform_admin gets admin tools (and could also get speaker tools
 *   if the admin is also a speaker — extensible in the future)
 * - speaker gets speaker tools
 * - sponsor gets sponsor tools
 * - audience gets audience tools
 */
export function registerToolsForRole(
  server: McpServer,
  ctx: ToolContext
): void {
  const register = roleRegistry[ctx.role];
  if (register) {
    register(server, ctx);
  }
}
