import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerToolsForRole } from "./tools/index";
import type { ToolContext } from "./types";

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({
    name: "fanflet",
    version: "0.1.0",
  });

  registerToolsForRole(server, ctx);

  return server;
}
