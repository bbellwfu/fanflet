import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@fanflet/db/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const preview = searchParams.get("preview");

  if (preview === "true") {
    return htmlResponse(
      "Preview Mode",
      "This is a preview — no changes were made."
    );
  }

  if (!email) {
    return htmlResponse("Invalid Link", "Missing required parameter.");
  }

  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(email.toLowerCase().trim())
  );
  const emailHash = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("platform_communication_unsubscribes")
    .upsert(
      { email_hash: emailHash, unsubscribed_at: new Date().toISOString() },
      { onConflict: "email_hash" }
    );

  if (error) {
    console.error("[unsubscribe] insert failed:", error.message);
    return htmlResponse(
      "Something went wrong",
      "We couldn't process your request. Please try again later."
    );
  }

  // Also flip the preference row to opted_in = false
  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (speaker) {
    await supabase
      .from("platform_communication_preferences")
      .update({
        opted_in: false,
        updated_at: new Date().toISOString(),
      })
      .eq("speaker_id", speaker.id)
      .eq("category", "platform_announcements");
  }

  return htmlResponse(
    "Unsubscribed",
    "You've been unsubscribed from Fanflet platform announcements. You can re-subscribe any time from your dashboard settings."
  );
}

function htmlResponse(title: string, message: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Fanflet</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 420px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    h1 { color: #1B365D; font-size: 22px; margin: 0 0 12px; }
    p { color: #64748b; font-size: 15px; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
