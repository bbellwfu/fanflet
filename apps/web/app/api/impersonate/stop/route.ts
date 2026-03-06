import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@fanflet/db/service";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const metaRaw = cookieStore.get("impersonation_meta")?.value;
    let returnPath: string | null = null;
    let savedAuthCookies: Record<string, string> | null = null;

    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        returnPath = meta.returnPath || null;
        const supabase = createServiceClient();

        // Fetch the saved admin auth cookies from the DB
        const { data: sessionRow } = await supabase
          .from("impersonation_sessions")
          .select("saved_auth_cookies")
          .eq("id", meta.sessionId)
          .single();

        if (sessionRow?.saved_auth_cookies) {
          savedAuthCookies = sessionRow.saved_auth_cookies as Record<string, string>;
        }

        await supabase
          .from("impersonation_sessions")
          .update({ ended_at: new Date().toISOString(), saved_auth_cookies: null })
          .eq("id", meta.sessionId);

        await supabase.from("impersonation_actions").insert({
          session_id: meta.sessionId,
          action_type: "session_ended",
          action_details: { ended_by: "admin_exit" },
        });
      } catch {
        // Best-effort cleanup
      }
    }

    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    const redirectTo = returnPath
      ? new URL(returnPath, adminUrl)
      : new URL(adminUrl);
    const response = NextResponse.redirect(redirectTo);

    // Clear impersonation cookies
    response.cookies.set("impersonation_meta", "", { path: "/", maxAge: 0 });
    response.cookies.set("impersonation_display", "", { path: "/", maxAge: 0 });
    response.cookies.set("active_role", "", { path: "/", maxAge: 0 });

    // Clear the impersonation auth cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const projectRef = supabaseUrl
      ? new URL(supabaseUrl).hostname.split(".")[0]
      : "";
    const cookiePrefix = `sb-${projectRef}-auth-token`;
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith(cookiePrefix)) {
        response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
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
  } catch (err) {
    console.error("Impersonation stop error:", err);
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    return NextResponse.redirect(new URL(adminUrl));
  }
}
