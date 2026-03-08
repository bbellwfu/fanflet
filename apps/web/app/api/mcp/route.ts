import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  createMcpServer,
  authenticateFromHeaders,
  McpAuthError,
  getMcpBaseUrl,
} from "@fanflet/mcp";

export const dynamic = "force-dynamic";

function buildResourceMetadataUrl(): string {
  const base = getMcpBaseUrl();
  return `${base}/.well-known/oauth-protected-resource/api/mcp`;
}

async function handleMcpRequest(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    const resourceMetadataUrl = buildResourceMetadataUrl();
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        error_description:
          "Authentication required. This MCP server supports OAuth 2.1 with PKCE.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
        },
      }
    );
  }

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
      const resourceMetadataUrl = buildResourceMetadataUrl();
      return new Response(JSON.stringify({ error: err.message }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
        },
      });
    }

    const message =
      err instanceof Error ? err.message : "Internal server error";
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
