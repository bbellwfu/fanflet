import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdminTools } from "./tools/admin/index";
import type { ToolContext } from "./types";

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({
    name: "fanflet-admin",
    version: "0.1.0",
  });

  registerAdminTools(server, ctx);

  return server;
}
