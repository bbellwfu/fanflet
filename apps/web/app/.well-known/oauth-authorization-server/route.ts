import { getOAuthMetadata } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getOAuthMetadata(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
