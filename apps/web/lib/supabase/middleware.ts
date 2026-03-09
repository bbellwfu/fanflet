import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_ROUTE_MAP: Record<string, string[]> = {
  speaker: ["/dashboard"],
  sponsor: ["/sponsor/dashboard", "/sponsor/leads", "/sponsor/connections", "/sponsor/integrations", "/sponsor/settings"],
  audience: ["/my"],
};

const ROLE_HOME: Record<string, string> = {
  speaker: "/dashboard",
  sponsor: "/sponsor/dashboard",
  audience: "/my",
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && request.cookies.get("active_role")) {
    supabaseResponse.cookies.delete("active_role");
  }

  // Allow impersonation API routes without additional checks
  if (pathname.startsWith("/api/impersonate/")) {
    return supabaseResponse;
  }

  // Check for expired impersonation session and auto-redirect to stop
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

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sponsor/dashboard") ||
    pathname.startsWith("/sponsor/onboarding") ||
    pathname.startsWith("/sponsor/leads") ||
    pathname.startsWith("/sponsor/connections") ||
    pathname.startsWith("/sponsor/integrations") ||
    pathname.startsWith("/sponsor/settings") ||
    pathname.startsWith("/my") ||
    pathname.startsWith("/become-speaker");

  if (!user && isProtected) {
    const hadSession = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.includes("auth-token"));
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    if (hadSession) {
      url.searchParams.set("reason", "session_expired");
    }
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const roles = resolveRoles(user);
    const activeRole = resolveActiveRole(request, roles);
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[activeRole] ?? "/dashboard";
    return NextResponse.redirect(url);
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
        const url = request.nextUrl.clone();
        url.pathname = ROLE_HOME[activeRole] ?? "/dashboard";
        return NextResponse.redirect(url);
      }
      return maybeSetActiveRoleCookie(supabaseResponse, request, activeRole);
    }

    // Become-speaker: only for users who don't already have the speaker role
    if (pathname.startsWith("/become-speaker")) {
      if (roles.includes("speaker")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      return maybeSetActiveRoleCookie(supabaseResponse, request, activeRole);
    }

    // Check if the active role allows this route
    const allowedPrefixes = ROLE_ROUTE_MAP[activeRole] ?? [];
    const routeAllowed = allowedPrefixes.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (!routeAllowed) {
      // Check if ANY of the user's roles would allow this route
      const correctRole = roles.find((role) => {
        const prefixes = ROLE_ROUTE_MAP[role] ?? [];
        return prefixes.some((prefix) => pathname.startsWith(prefix));
      });

      if (correctRole) {
        // Switch to the correct role and allow the request
        const response = NextResponse.redirect(request.nextUrl);
        response.cookies.set("active_role", correctRole, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        });
        return response;
      }

      // User doesn't have any role that allows this route
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[activeRole] ?? "/dashboard";
      return NextResponse.redirect(url);
    }

    return maybeSetActiveRoleCookie(supabaseResponse, request, activeRole);
  }

  return supabaseResponse;
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
  const cookieRole = request.cookies.get("active_role")?.value;
  if (cookieRole && roles.includes(cookieRole)) {
    return cookieRole;
  }
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
