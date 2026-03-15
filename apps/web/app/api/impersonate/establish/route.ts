import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@fanflet/db/service";
import {
  hashToken,
  signImpersonationJWT,
  getTargetUser,
} from "@fanflet/db/impersonation";
import {
  getImpersonationAuthCookieName,
  getImpersonationAuthChunkName,
} from "@/lib/impersonation-cookie";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const returnPath = request.nextUrl.searchParams.get("returnPath");
  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing_token", request.url)
    );
  }

  // Web app must have SUPABASE_JWT_SECRET set to sign impersonation JWTs
  if (!process.env.SUPABASE_JWT_SECRET) {
    console.error(
      "[impersonate/establish] SUPABASE_JWT_SECRET is not set in the web app. Set it in apps/web/.env.local (same value as Supabase Dashboard > Settings > API > JWT Secret)."
    );
    return NextResponse.redirect(
      new URL("/login?error=jwt_secret_not_configured", request.url)
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
    redirectUrl.searchParams.set("__imp", session.id);

    const sessionPayloadObj = {
      access_token: jwt,
      token_type: "bearer" as const,
      expires_in: Math.floor(new Date(session.expires_at).getTime() / 1000) - Math.floor(Date.now() / 1000),
      expires_at: Math.floor(new Date(session.expires_at).getTime() / 1000),
      refresh_token: "",
      user: {
        id: session.target_user_id,
        aud: "authenticated",
        role: "authenticated",
        email: targetUser.email,
        app_metadata: targetUser.app_metadata ?? {},
        user_metadata: targetUser.user_metadata ?? {},
      },
    };

    const { error: updateError } = await supabase
      .from("impersonation_sessions")
      .update({ session_payload: sessionPayloadObj })
      .eq("id", session.id);

    if (updateError) {
      console.error("[impersonate/establish] session_payload update failed:", updateError);
      return NextResponse.redirect(
        new URL("/login?error=impersonation_failed", request.url)
      );
    }

    // Save existing Supabase auth cookies to the DB so they can be restored
    // when impersonation ends. Do NOT clear them in the response: on localhost
    // cookies are shared across ports, so clearing would wipe the admin app's
    // session. The web app ignores sb-* when fanflet_impersonation_auth is
    // present (getCookiesForSupabase), so we never overwrite the admin's cookie.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const supabaseCookiePrefix = `sb-${projectRef}-auth-token`;
    const savedCookies: Record<string, string> = {};
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith(supabaseCookiePrefix)) {
        savedCookies[cookie.name] = cookie.value;
      }
    }
    if (Object.keys(savedCookies).length > 0) {
      await supabase
        .from("impersonation_sessions")
        .update({ saved_auth_cookies: savedCookies })
        .eq("id", session.id);
    }

    // Build cookies for the response
    const sessionPayload = JSON.stringify(sessionPayloadObj);
    const cookieHeaders: string[] = [];

    const isProduction = process.env.NODE_ENV === "production";
    const CHUNK_SIZE = 3180;

    function serializeCookie(name: string, value: string, opts: { httpOnly?: boolean; sameSite?: string; secure?: boolean; maxAge?: number; path?: string }): string {
      const parts = [`${name}=${encodeURIComponent(value)}`];
      parts.push(`Path=${opts.path ?? "/"}`);
      if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
      if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
      if (opts.secure) parts.push("Secure");
      if (opts.httpOnly) parts.push("HttpOnly");
      return parts.join("; ");
    }

    const impCookieName = getImpersonationAuthCookieName();
    if (sessionPayload.length <= CHUNK_SIZE) {
      cookieHeaders.push(serializeCookie(impCookieName, sessionPayload, { httpOnly: true, sameSite: "Lax", secure: isProduction, maxAge: 3600 }));
    } else {
      const chunks = Math.ceil(sessionPayload.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        cookieHeaders.push(serializeCookie(
          getImpersonationAuthChunkName(i),
          sessionPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          { httpOnly: true, sameSite: "Lax", secure: isProduction, maxAge: 3600 }
        ));
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

    cookieHeaders.push(serializeCookie("impersonation_meta", metaCookie, { httpOnly: true, sameSite: "Strict", secure: isProduction, maxAge: 3600 }));
    cookieHeaders.push(serializeCookie("impersonation_display", displayCookie, { httpOnly: false, sameSite: "Strict", secure: isProduction, maxAge: 3600 }));

    // Return an HTML page that polls for session readiness before navigating.
    // This eliminates the replication-lag race condition: the browser stays on
    // this page until the DB read replica has the session_payload.
    const checkUrl = new URL("/api/impersonate/check", request.url);
    checkUrl.searchParams.set("sessionId", session.id);
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setting up session…</title>
<style>
  body{margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#fef3c7}
  .card{text-align:center;padding:2rem}
  .spinner{width:32px;height:32px;border:3px solid #d97706;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 1rem}
  @keyframes spin{to{transform:rotate(360deg)}}
  h2{color:#92400e;font-size:1.125rem;margin:0 0 .25rem}
  p{color:#a16207;font-size:.875rem;margin:0}
  .error{display:none}
  .error h2{color:#991b1b}
  .error p{color:#b91c1c}
  a{color:#2563eb;text-decoration:underline}
</style>
</head>
<body>
<div class="card">
  <div id="loading">
    <div class="spinner"></div>
    <h2>Setting up session…</h2>
    <p>Please wait while we prepare the impersonation session.</p>
  </div>
  <div id="error" class="error">
    <h2>Session setup timed out</h2>
    <p>The session could not be verified. <a href="${adminUrl}">Return to admin</a> and try again.</p>
  </div>
</div>
<script>
(function(){
  var attempts=0,maxAttempts=6;
  function poll(){
    attempts++;
    fetch("${checkUrl.toString()}").then(function(r){return r.json()}).then(function(d){
      if(d.ready){window.location.replace("${redirectUrl.toString()}");return}
      if(attempts<maxAttempts){setTimeout(poll,500)}
      else{document.getElementById("loading").style.display="none";document.getElementById("error").style.display="block"}
    }).catch(function(){
      if(attempts<maxAttempts){setTimeout(poll,500)}
      else{document.getElementById("loading").style.display="none";document.getElementById("error").style.display="block"}
    });
  }
  poll();
})();
</script>
</body>
</html>`;

    const headers = new Headers();
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    for (const c of cookieHeaders) {
      headers.append("Set-Cookie", c);
    }
    return new Response(html, { status: 200, headers });
  } catch (err) {
    console.error("Impersonation establish error:", err);
    return NextResponse.redirect(
      new URL("/login?error=impersonation_failed", request.url)
    );
  }
}
