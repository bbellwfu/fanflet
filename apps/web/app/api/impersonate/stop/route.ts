import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@fanflet/db/service";
import { cookies } from "next/headers";
import {
  getImpersonationAuthCookieName,
} from "@/lib/impersonation-cookie";

/** Shared stop logic: clear session, return redirect response. */
async function performStop(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const impSessionId = request.nextUrl.searchParams.get("__imp");
    const metaRaw = cookieStore.get("impersonation_meta")?.value;

    let sessionId: string | null = impSessionId ?? null;
    let returnPath: string | null = null;
    let savedAuthCookies: Record<string, string> | null = null;
    let hasSiblings = false;

    if (!sessionId && metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        sessionId = meta.sessionId ?? null;
      } catch {
        // Ignore
      }
    }

    if (sessionId) {
      const supabase = createServiceClient();

      // Fetch session row including return_path and saved_auth_cookies
      const { data: sessionRow } = await supabase
        .from("impersonation_sessions")
        .select("saved_auth_cookies, return_path, admin_id")
        .eq("id", sessionId)
        .single();

      if (sessionRow?.saved_auth_cookies) {
        savedAuthCookies = sessionRow.saved_auth_cookies as Record<string, string>;
      }

      // Read return_path from DB (preferred) or fall back to cookie
      returnPath = (sessionRow?.return_path as string) ?? null;
      if (!returnPath && metaRaw) {
        try {
          const meta = JSON.parse(metaRaw);
          returnPath = meta.returnPath || null;
        } catch {
          // Ignore
        }
      }

      // End this specific session
      await supabase
        .from("impersonation_sessions")
        .update({
          ended_at: new Date().toISOString(),
          saved_auth_cookies: null,
          session_payload: null,
        })
        .eq("id", sessionId);

      await supabase.from("impersonation_actions").insert({
        session_id: sessionId,
        action_type: "session_ended",
        action_details: { ended_by: "admin_exit" },
      });

      // Check for sibling sessions (other active sessions by the same admin)
      if (sessionRow?.admin_id) {
        const { count } = await supabase
          .from("impersonation_sessions")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", sessionRow.admin_id)
          .is("ended_at", null)
          .gt("expires_at", new Date().toISOString())
          .neq("id", sessionId);
        hasSiblings = (count ?? 0) > 0;
      }
    }

    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    const redirectTo = returnPath
      ? new URL(returnPath, adminUrl)
      : new URL(adminUrl);
    const response = NextResponse.redirect(redirectTo);

    // Only clear cookies if no other impersonation tabs are active
    if (!hasSiblings) {
      response.cookies.set("impersonation_meta", "", { path: "/", maxAge: 0 });
      response.cookies.set("impersonation_display", "", { path: "/", maxAge: 0 });
      response.cookies.set("active_role", "", { path: "/", maxAge: 0 });

      // Clear the dedicated impersonation auth cookie (and any chunks)
      const impName = getImpersonationAuthCookieName();
      response.cookies.set(impName, "", { path: "/", maxAge: 0 });
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith(impName + ".")) {
          response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
        }
      }
    }

    // Restore the admin's original auth cookies from the DB
    if (savedAuthCookies) {
      for (const [name, value] of Object.entries(savedAuthCookies)) {
        response.cookies.set(name, value, {
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: false,
          maxAge: 3600,
        });
      }
    }

  return response;
}

export async function POST(request: NextRequest) {
  try {
    return await performStop(request);
  } catch (err) {
    console.error("Impersonation stop error:", err);
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    return NextResponse.redirect(new URL(adminUrl));
  }
}

/** GET allowed so middleware can redirect expired __imp sessions to stop. */
export async function GET(request: NextRequest) {
  try {
    return await performStop(request);
  } catch (err) {
    console.error("Impersonation stop error:", err);
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    return NextResponse.redirect(new URL(adminUrl));
  }
}
