import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@fanflet/db/service";
import {
  hashToken,
  signImpersonationJWT,
  getTargetUser,
} from "@fanflet/db/impersonation";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const returnPath = request.nextUrl.searchParams.get("returnPath");
  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing_token", request.url)
    );
  }

  try {
    const supabase = createServiceClient();
    const tokenHash = await hashToken(token);

    const { data: tokenRow, error: tokenError } = await supabase
      .from("impersonation_tokens")
      .select("id, session_id, used, expires_at")
      .eq("token_hash", tokenHash)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_impersonation_token", request.url)
      );
    }

    if (tokenRow.used) {
      return NextResponse.redirect(
        new URL("/login?error=token_already_used", request.url)
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL("/login?error=token_expired", request.url)
      );
    }

    await supabase
      .from("impersonation_tokens")
      .update({ used: true })
      .eq("id", tokenRow.id);

    const { data: session, error: sessionError } = await supabase
      .from("impersonation_sessions")
      .select(
        "id, admin_id, target_user_id, target_role, write_enabled, expires_at"
      )
      .eq("id", tokenRow.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.redirect(
        new URL("/login?error=session_not_found", request.url)
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL("/login?error=session_expired", request.url)
      );
    }

    const targetUser = await getTargetUser(session.target_user_id);
    const adminUser = await supabase.auth.admin.getUserById(session.admin_id);

    const jwt = await signImpersonationJWT({
      targetUserId: session.target_user_id,
      adminId: session.admin_id,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at),
      targetAppMetadata: targetUser.app_metadata ?? {},
      targetUserMetadata: targetUser.user_metadata ?? {},
    });

    await supabase
      .from("impersonation_sessions")
      .update({ started_at: new Date().toISOString() })
      .eq("id", session.id);

    const redirectPath =
      session.target_role === "sponsor" ? "/sponsor/dashboard" : "/dashboard";
    const redirectUrl = new URL(redirectPath, request.url);
    const response = NextResponse.redirect(redirectUrl);

    // Save existing Supabase auth cookies to the DB so they can be restored
    // when impersonation ends. Storing in the DB avoids cookie size limits.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const cookiePrefix = `sb-${projectRef}-auth-token`;
    const savedCookies: Record<string, string> = {};
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith(cookiePrefix)) {
        savedCookies[cookie.name] = cookie.value;
        response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
      }
    }
    if (Object.keys(savedCookies).length > 0) {
      await supabase
        .from("impersonation_sessions")
        .update({ saved_auth_cookies: savedCookies })
        .eq("id", session.id);
    }

    // Set the auth cookie directly in the format the Supabase SSR client
    // expects. We bypass setSession() because it fails with an empty
    // refresh_token. The cookie value is a JSON session object, chunked
    // across multiple cookies if it exceeds ~3180 bytes.
    const expiresAtEpoch = Math.floor(new Date(session.expires_at).getTime() / 1000);
    const sessionPayload = JSON.stringify({
      access_token: jwt,
      token_type: "bearer",
      expires_in: expiresAtEpoch - Math.floor(Date.now() / 1000),
      expires_at: expiresAtEpoch,
      refresh_token: "",
      user: {
        id: session.target_user_id,
        aud: "authenticated",
        role: "authenticated",
        email: targetUser.email,
        app_metadata: targetUser.app_metadata ?? {},
        user_metadata: targetUser.user_metadata ?? {},
      },
    });

    const CHUNK_SIZE = 3180;
    const authCookieOpts = {
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
      maxAge: 3600,
    };

    if (sessionPayload.length <= CHUNK_SIZE) {
      response.cookies.set(cookiePrefix, sessionPayload, authCookieOpts);
    } else {
      const chunks = Math.ceil(sessionPayload.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        response.cookies.set(
          `${cookiePrefix}.${i}`,
          sessionPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          authCookieOpts
        );
      }
    }

    const adminEmail = adminUser.data?.user?.email ?? "admin";
    const adminName =
      adminUser.data?.user?.user_metadata?.name ?? adminEmail;
    const targetName =
      targetUser.user_metadata?.name ??
      targetUser.email ??
      "Unknown";
    const targetEmail = targetUser.email ?? "";

    const metaCookie = JSON.stringify({
      sessionId: session.id,
      adminId: session.admin_id,
      targetUserId: session.target_user_id,
      targetRole: session.target_role,
      writeEnabled: session.write_enabled,
      expiresAt: session.expires_at,
      returnPath: returnPath || null,
    });

    const displayCookie = JSON.stringify({
      targetName,
      targetEmail,
      adminName,
      adminEmail,
      targetRole: session.target_role,
      writeEnabled: session.write_enabled,
      expiresAt: session.expires_at,
    });

    const cookieOptions = {
      path: "/",
      sameSite: "strict" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600,
    };

    response.cookies.set("impersonation_meta", metaCookie, {
      ...cookieOptions,
      httpOnly: true,
    });

    response.cookies.set("impersonation_display", displayCookie, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error("Impersonation establish error:", err);
    return NextResponse.redirect(
      new URL("/login?error=impersonation_failed", request.url)
    );
  }
}
