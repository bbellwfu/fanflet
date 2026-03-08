import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  createMcpServer,
  authenticateFromHeaders,
  McpAuthError,
} from "@fanflet/mcp";

export const dynamic = "force-dynamic";

function getWebBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

async function handleMcpRequest(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    const resourceMetadataUrl = `${getWebBaseUrl()}/.well-known/oauth-protected-resource/api/mcp`;
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

    const server = createMcpServer(ctx, {
      allowedRoles: ["speaker", "sponsor", "audience"],
    });

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);

    const response = await transport.handleRequest(req);
    return response;
  } catch (err) {
    if (err instanceof McpAuthError) {
      const resourceMetadataUrl = `${getWebBaseUrl()}/.well-known/oauth-protected-resource/api/mcp`;
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

    const status = message.includes("not allowed on this MCP endpoint")
      ? 403
      : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
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
