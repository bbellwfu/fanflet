import { getProtectedResourceMetadata } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

function getWebBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function GET() {
  return Response.json(getProtectedResourceMetadata(getWebBaseUrl()), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
