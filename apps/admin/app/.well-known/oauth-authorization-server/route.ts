import { getOAuthMetadata } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

function getAdminBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3001";
}

export function GET() {
  return Response.json(getOAuthMetadata(getAdminBaseUrl()), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
