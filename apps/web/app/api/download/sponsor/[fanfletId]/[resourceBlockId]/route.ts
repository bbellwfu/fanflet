import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@fanflet/db/service";
import { extractFilename } from "@fanflet/db/storage";
import { rateLimit } from "@/lib/rate-limit";

const SPONSOR_BUCKET = "sponsor-file-uploads";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_URL_SECONDS = 60 * 60; // 60 minutes

interface SponsorDownloadRow {
  id: string;
  fanflet_id: string;
  sponsor_library_item_id: string | null;
  fanflets: {
    status: string;
    slug: string;
    expiration_date: string | null;
    speaker_id: string;
    speakers: { slug: string };
  };
  sponsor_resource_library: {
    status: string;
    file_path: string | null;
  } | null;
}

/**
 * Sponsor file download route.
 * Block must have sponsor_library_item_id; resolves sponsor_resource_library.
 * status draft → 403; status removed → tombstone HTML; available/unpublished → signed URL.
 * Uses service client for data fetch so unauthenticated audience can download.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fanfletId: string; resourceBlockId: string }> }
) {
  const rl = rateLimit(request, "download", 30, 60_000);
  if (rl.limited) return rl.response!;

  const { fanfletId, resourceBlockId } = await params;

  if (!UUID_RE.test(fanfletId) || !UUID_RE.test(resourceBlockId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: row, error } = await serviceClient
    .from("resource_blocks")
    .select(`
      id, fanflet_id, sponsor_library_item_id,
      fanflets!inner ( status, slug, expiration_date, speaker_id, speakers!inner ( slug ) ),
      sponsor_resource_library ( status, file_path )
    `)
    .eq("id", resourceBlockId)
    .eq("fanflet_id", fanfletId)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const typed = row as unknown as SponsorDownloadRow;
  if (!typed.sponsor_library_item_id || !typed.sponsor_resource_library) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const fanflet = typed.fanflets;
  const speakerSlug = fanflet.speakers.slug;
  const fanfletSlug = fanflet.slug;
  const fanfletPagePath = fanfletSlug ? `/${speakerSlug}/${fanfletSlug}` : `/${speakerSlug}`;

  if (fanflet.status !== "published") {
    return NextResponse.redirect(new URL(fanfletPagePath, request.url), 302);
  }

  if (fanflet.expiration_date) {
    const expiry = new Date(fanflet.expiration_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiry < today) {
      const expiredUrl = new URL(fanfletPagePath, request.url);
      expiredUrl.searchParams.set("expired_download", "1");
      return NextResponse.redirect(expiredUrl, 302);
    }
  }

  const status = typed.sponsor_resource_library.status;

  if (status === "draft") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (status === "removed") {
    const tombstoneHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Content unavailable</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:1rem;text-align:center"><h1 style="font-size:1.25rem">This content is no longer available</h1><p style="color:#64748b">The sponsor has removed this resource.</p><p><a href="${fanfletPagePath}" style="color:#0d9488">Return to the page</a></p></body></html>`;
    return new NextResponse(tombstoneHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const filePath = typed.sponsor_resource_library.file_path;
  if (!filePath) {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  const originalFilename = extractFilename(filePath);
  const { data: signed, error: signError } = await serviceClient.storage
    .from(SPONSOR_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_SECONDS, {
      download: originalFilename,
    });

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const dateStr = new Date().toISOString().split("T")[0];
  const hashInput = `${ip}-${ua}-${dateStr}`;
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
  const visitorHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  const supabase = await createClient();
  void supabase.from("analytics_events").insert({
    fanflet_id: fanfletId,
    event_type: "resource_download",
    resource_block_id: resourceBlockId,
    visitor_hash: visitorHash,
    device_type: deviceType,
    referrer: request.headers.get("referer") ?? null,
  });

  return NextResponse.redirect(signed.signedUrl, 302);
}
