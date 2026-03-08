import { NextResponse } from "next/server";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import {
  getOAuthClient,
  createAuthorizationCode,
  isRedirectUriAllowed,
} from "@fanflet/mcp";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const scope = searchParams.get("scope");

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "client_id and redirect_uri required" },
      { status: 400 }
    );
  }
  if (responseType !== "code") {
    return NextResponse.json(
      { error: "unsupported_response_type", error_description: "response_type must be code" },
      { status: 400 }
    );
  }
  if (!isRedirectUriAllowed(redirectUri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri not allowed" },
      { status: 400 }
    );
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "code_challenge and code_challenge_method=S256 required" },
      { status: 400 }
    );
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Unknown client_id" },
      { status: 400 }
    );
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri not registered for this client" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const sc = createServiceClient();
    const { data: row, error } = await sc
      .from("mcp_oauth_pending_requests")
      .insert({
        redirect_uri: redirectUri,
        client_id: clientId,
        code_challenge: codeChallenge,
        state: state ?? null,
        scope: scope ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      return NextResponse.json(
        { error: "server_error", error_description: "Failed to store authorization request" },
        { status: 500 }
      );
    }

    const loginUrl = new URL("/login", getAdminUrl());
    loginUrl.searchParams.set("mcp_state", row.id);
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
    clientId,
    authUserId: user.id,
    redirectUri,
    codeChallenge,
    state: state ?? undefined,
    scope: scope ?? undefined,
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state != null) target.searchParams.set("state", state);
  return NextResponse.redirect(target.toString());
}
