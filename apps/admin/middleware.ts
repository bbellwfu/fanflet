import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
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
  const isLoginOrCallback =
    pathname === "/login" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/auth");

  const isMcpRoute =
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/.well-known/");

  if (isLoginOrCallback || isMcpRoute) {
    return supabaseResponse;
  }

  // All non-login routes require authentication + platform_admin role
  if (!user) {
    const hadSession = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.includes("auth-token"));
    const loginUrl = new URL("/login", request.url);
    if (hadSession) {
      loginUrl.searchParams.set("reason", "session_expired");
    }
    return NextResponse.redirect(loginUrl);
  }

  const appMetadataRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (appMetadataRole === "platform_admin") {
    return supabaseResponse;
  }

  // Check user_roles table as fallback (for admins not set via app_metadata)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (roleRow) {
    return supabaseResponse;
  }

  return NextResponse.redirect(
    new URL("/login?error=admin_required", request.url)
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
