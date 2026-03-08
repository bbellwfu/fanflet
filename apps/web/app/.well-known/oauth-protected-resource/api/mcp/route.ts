import { getProtectedResourceMetadata } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getProtectedResourceMetadata(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
