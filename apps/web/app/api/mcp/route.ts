import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer, authenticateFromHeaders, McpAuthError } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

async function handleMcpRequest(req: Request): Promise<Response> {
  try {
    const ctx = await authenticateFromHeaders(req.headers);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    const server = createMcpServer(ctx);
    await server.connect(transport);

    const response = await transport.handleRequest(req);
    return response;
  } catch (err) {
    if (err instanceof McpAuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handleMcpRequest(req);
}
