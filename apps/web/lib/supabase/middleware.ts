import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getCookiesForSupabase,
  getSupabaseAuthCookiePrefix,
} from "@/lib/impersonation-cookie";
import { getImpersonationSessionPayload } from "@/lib/impersonation-session";
import type { User } from "@supabase/supabase-js";

const ROLE_ROUTE_MAP: Record<string, string[]> = {
  speaker: ["/dashboard"],
  sponsor: ["/sponsor/dashboard", "/sponsor/leads", "/sponsor/connections", "/sponsor/integrations", "/sponsor/settings", "/sponsor/campaigns", "/sponsor/library", "/sponsor/analytics"],
  audience: ["/my"],
};

const ROLE_HOME: Record<string, string> = {
  speaker: "/dashboard",
  sponsor: "/sponsor/dashboard",
  audience: "/my",
};

const CONSENT_EXEMPT_COUNTRIES = new Set(["US", "CA"]);
const IMP_SESSION_HEADER = "x-impersonation-session-id";
const IMP_TARGET_ROLE_HEADER = "x-impersonation-target-role";

/** Preserve __imp in redirect URL when present in request. */
function redirectWithImp(nextUrl: URL, request: NextRequest): URL {
  const imp = request.nextUrl.searchParams.get("__imp");
  if (imp) nextUrl.searchParams.set("__imp", imp);
  return nextUrl;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Set geo-based cookie consent flag for GTM.
  const country = request.headers.get("x-vercel-ip-country") ?? "US";
  const needsConsent = !CONSENT_EXEMPT_COUNTRIES.has(country);
  supabaseResponse.headers.set("x-user-country", country);
  if (!request.cookies.has("cookie_consent")) {
    supabaseResponse.cookies.set("cookie_consent_required", needsConsent ? "1" : "0", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const pathname = request.nextUrl.pathname;
  const impSessionId = request.nextUrl.searchParams.get("__imp");

  let user: User | null = null;

  if (impSessionId) {
    let result = await getImpersonationSessionPayload(impSessionId);
    // Retry once after a short delay — handles read-replica replication lag
    // when navigating immediately after session creation.
    if (!result) {
      await new Promise((r) => setTimeout(r, 500));
      result = await getImpersonationSessionPayload(impSessionId);
    }
    if (result) {
      // Construct user directly from the DB-backed session payload instead of
      // calling getUser() against GoTrue. The custom-signed impersonation JWT
      // is not a real GoTrue session, so getUser() rejects it. The payload
      // already contains all fields middleware needs (id, app_metadata, etc.).
      const payloadUser = result.payload.user;
      user = {
        id: payloadUser.id,
        aud: payloadUser.aud ?? "authenticated",
        role: payloadUser.role ?? "authenticated",
        email: payloadUser.email ?? "",
        app_metadata: payloadUser.app_metadata ?? {},
        user_metadata: payloadUser.user_metadata ?? {},
        created_at: "",
      } as User;
      request.headers.set(IMP_SESSION_HEADER, impSessionId);
      request.headers.set(IMP_TARGET_ROLE_HEADER, result.targetRole);
      supabaseResponse = NextResponse.next({ request });
    }
    // __imp in URL but session invalid/missing: redirect to stop so we never show another user's content.
    // Skip when we're already on /api/impersonate/* so the stop route can run (avoid redirect loop).
    if (!user && !pathname.startsWith("/api/impersonate/")) {
      const stopUrl = new URL("/api/impersonate/stop", request.url);
      stopUrl.searchParams.set("__imp", impSessionId);
      return NextResponse.redirect(stopUrl);
    }
  }

  if (!user) {
    const supabasePrefix = getSupabaseAuthCookiePrefix();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return getCookiesForSupabase(
              () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
              supabasePrefix
            );
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  }


  if (!user && request.cookies.get("active_role")) {
    supabaseResponse.cookies.delete("active_role");
  }

  // Allow impersonation API routes without additional checks
  if (pathname.startsWith("/api/impersonate/")) {
    return supabaseResponse;
  }

  // Check for expired cookie-only impersonation (no __imp in URL).
  // When __imp IS present, the first block above already validates the session
  // and redirects to stop if invalid/expired — no need to check again.
  if (!impSessionId) {
    const impersonationMeta = request.cookies.get("impersonation_meta")?.value;
    if (impersonationMeta) {
      try {
        const meta = JSON.parse(impersonationMeta);
        if (new Date(meta.expiresAt) < new Date()) {
          return NextResponse.redirect(
            new URL("/api/impersonate/stop", request.url)
          );
        }
      } catch {
        // Malformed cookie — continue normally
      }
    }
  }

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sponsor/dashboard") ||
    pathname.startsWith("/sponsor/campaigns") ||
    pathname.startsWith("/sponsor/library") ||
    pathname.startsWith("/sponsor/onboarding") ||
    pathname.startsWith("/sponsor/leads") ||
    pathname.startsWith("/sponsor/connections") ||
    pathname.startsWith("/sponsor/integrations") ||
    pathname.startsWith("/sponsor/settings") ||
    pathname.startsWith("/sponsor/analytics") ||
    pathname.startsWith("/my") ||
    pathname.startsWith("/become-speaker");

  if (!user && isProtected) {
    const hadSession = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.includes("auth-token"));
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    if (hadSession) {
      url.searchParams.set("reason", "session_expired");
    }
    return NextResponse.redirect(redirectWithImp(url, request));
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const roles = resolveRoles(user);
    const activeRole = resolveActiveRole(request, roles);
    const url = new URL(ROLE_HOME[activeRole] ?? "/dashboard", request.url);
    return NextResponse.redirect(redirectWithImp(url, request));
  }

  if (user && isProtected) {
    const roles = resolveRoles(user);
    const activeRole = resolveActiveRole(request, roles);

    // Sponsor onboarding: allow if user has "sponsor" in roles (adding role or completing onboarding)
    if (pathname.startsWith("/sponsor/onboarding")) {
      const signupRole = user.user_metadata?.signup_role;
      const isSponsorSignup = signupRole === "sponsor";
      const hasSponsorRole = roles.includes("sponsor");
      if (!isSponsorSignup && !hasSponsorRole) {
        const url = new URL(ROLE_HOME[activeRole] ?? "/dashboard", request.url);
        return NextResponse.redirect(redirectWithImp(url, request));
      }
      return maybeSetActiveRoleCookie(supabaseResponse, request, activeRole);
    }

    // Become-speaker: only for users who don't already have the speaker role
    if (pathname.startsWith("/become-speaker")) {
      if (roles.includes("speaker")) {
        const url = new URL("/dashboard", request.url);
        return NextResponse.redirect(redirectWithImp(url, request));
      }
      return maybeSetActiveRoleCookie(supabaseResponse, request, activeRole);
    }

    // Check if the active role allows this route
    const allowedPrefixes = ROLE_ROUTE_MAP[activeRole] ?? [];
    const routeAllowed = allowedPrefixes.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (!routeAllowed) {
      const url = new URL(ROLE_HOME[activeRole] ?? "/dashboard", request.url);
      return NextResponse.redirect(redirectWithImp(url, request));
    }

    return maybeSetActiveRoleCookie(supabaseResponse, request, activeRole);
  }

  // Add AI crawler opt-out headers on public speaker content pages.
  // Any path that isn't a known app route is a speaker page ([speakerSlug]/[fanfletSlug]).
  // This backs up the robots.txt and meta tag directives with HTTP headers,
  // which also cover non-HTML resources (PDFs, images, etc.).
  if (!isProtected && !isKnownAppRoute(pathname)) {
    supabaseResponse.headers.set(
      "X-Robots-Tag",
      "noai, noimageai"
    );
  }

  return supabaseResponse;
}

/** Routes that belong to the app (not speaker-generated content). */
const KNOWN_APP_PREFIXES = [
  "/api/",
  "/auth/",
  "/login",
  "/signup",
  "/dashboard",
  "/sponsor/",
  "/my",
  "/become-speaker",
  "/demo",
  "/about",
  "/contact",
  "/pricing",
  "/terms",
  "/privacy",
  "/legal",
  "/reports/",
  "/llms.txt",
];

function isKnownAppRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return KNOWN_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function resolveRoles(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): string[] {
  const meta = user.app_metadata;
  if (meta && Array.isArray(meta.roles) && meta.roles.length > 0) {
    return meta.roles as string[];
  }
  // Fallback for users created before the roles migration
  const signupRole = user.user_metadata?.signup_role;
  if (typeof signupRole === "string") {
    if (signupRole === "sponsor") return ["sponsor"];
    if (signupRole === "audience") return ["audience"];
  }
  return ["speaker"];
}

function resolveActiveRole(request: NextRequest, roles: string[]): string {
  const pathname = request.nextUrl.pathname;

  // 1. __imp session: role from header (set by middleware when loading session from DB)
  const impRole = request.headers.get(IMP_TARGET_ROLE_HEADER);
  if (impRole && (impRole === "speaker" || impRole === "sponsor")) {
    return impRole;
  }

  // 2. Cookie-based impersonation
  const impersonationCookie = request.cookies.get("impersonation_meta")?.value;
  if (impersonationCookie) {
    try {
      const meta = JSON.parse(impersonationCookie);
      if (meta.targetRole && roles.includes(meta.targetRole)) {
        return meta.targetRole;
      }
    } catch {
      // Ignore JSON parse errors for malformed cookies
    }
  }

  // 3. Path-based detection (prioritize the path they are trying to visit)
  if (pathname.startsWith("/sponsor/") && roles.includes("sponsor")) {
    return "sponsor";
  }
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/become-speaker")) && roles.includes("speaker")) {
    return "speaker";
  }
  if (pathname.startsWith("/my") && roles.includes("audience")) {
    return "audience";
  }

  for (const role of roles) {
    const prefixes = ROLE_ROUTE_MAP[role] ?? [];
    if (prefixes.some((prefix) => pathname.startsWith(prefix))) {
      return role;
    }
  }

  // 4. Fallback to cookie (e.g., when visiting /login or root /)
  const cookieRole = request.cookies.get("active_role")?.value;
  if (cookieRole && roles.includes(cookieRole)) {
    return cookieRole;
  }

  // 5. Ultimate fallback
  return roles[0] ?? "speaker";
}

function maybeSetActiveRoleCookie(
  response: NextResponse,
  request: NextRequest,
  activeRole: string
): NextResponse {
  const currentCookie = request.cookies.get("active_role")?.value;
  if (currentCookie !== activeRole) {
    response.cookies.set("active_role", activeRole, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
