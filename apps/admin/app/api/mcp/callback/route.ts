import { NextResponse } from "next/server";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { createAuthorizationCode } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

function getAdminUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  return url.replace(/\/$/, "");
}

async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  appMetadataRole?: string
): Promise<boolean> {
  if (appMetadataRole === "platform_admin") return true;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  return !!roleRow;
}

/** Expiry for pending requests: 15 minutes. */
const PENDING_REQUEST_MAX_AGE_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("state");

  if (!requestId || !requestId.trim()) {
    return new NextResponse(
      "<!DOCTYPE html><html><body><p>This sign-in link is invalid. Please try connecting again from Claude.</p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const sc = createServiceClient();
  const { data: pending, error: fetchError } = await sc
    .from("mcp_oauth_pending_requests")
    .select("id, redirect_uri, client_id, code_challenge, state, scope, created_at")
    .eq("id", requestId.trim())
    .maybeSingle();

  if (fetchError || !pending) {
    return new NextResponse(
      "<!DOCTYPE html><html><body><p>This sign-in link has expired. Please try connecting again from Claude.</p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const age = Date.now() - new Date(pending.created_at).getTime();
  if (age > PENDING_REQUEST_MAX_AGE_MS) {
    await sc.from("mcp_oauth_pending_requests").delete().eq("id", pending.id);
    return new NextResponse(
      "<!DOCTYPE html><html><body><p>This sign-in link has expired. Please try connecting again from Claude.</p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", getAdminUrl());
    loginUrl.searchParams.set("mcp_state", requestId.trim());
    return NextResponse.redirect(loginUrl.toString());
  }

  const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined;
  const admin = await isPlatformAdmin(supabase, user.id, appRole);
  if (!admin) {
    const loginUrl = new URL("/login", getAdminUrl());
    loginUrl.searchParams.set("error", "admin_required");
    return NextResponse.redirect(loginUrl.toString());
  }

  const code = await createAuthorizationCode({
    clientId: pending.client_id,
    authUserId: user.id,
    redirectUri: pending.redirect_uri,
    codeChallenge: pending.code_challenge,
    state: pending.state ?? undefined,
    scope: pending.scope ?? undefined,
  });

  await sc.from("mcp_oauth_pending_requests").delete().eq("id", pending.id);

  const target = new URL(pending.redirect_uri);
  target.searchParams.set("code", code);
  if (pending.state != null) target.searchParams.set("state", pending.state);
  return NextResponse.redirect(target.toString());
}
