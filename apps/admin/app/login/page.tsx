import { redirect } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const next = typeof params.next === "string" ? params.next : "/";
  const errorParam = typeof params.error === "string" ? params.error : null;
  const reasonParam = typeof params.reason === "string" ? params.reason : null;
  const mcpState = typeof params.mcp_state === "string" ? params.mcp_state : null;

  // If Supabase redirected here with a code (shouldn't normally happen, but handle it),
  // send it to the Route Handler which CAN set cookies.
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();

  // If user is signed in but lacks admin access, redirect to signout so cookies are actually
  // cleared (Server Component signOut() may not set response cookies). This breaks redirect loops.
  if (errorParam === "admin_required") {
    redirect(`/api/auth/signout?next=${encodeURIComponent("/login?error=admin_required")}`);
  }

  // If the user is already signed in as an admin, redirect to the dashboard.
  // Use the same role logic as middleware so we never redirect to / unless middleware would allow.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const appMetadataRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
      if (appMetadataRole === "platform_admin" || appMetadataRole === "super_admin") {
        redirect("/");
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .in("role", ["super_admin", "platform_admin"])
        .filter("removed_at", "is", "null")
        .maybeSingle();
      if (roleRow) {
        redirect("/");
      }
    }
  } catch (err) {
    // redirect() throws a special error -- rethrow it
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
  }

  return <LoginForm error={errorParam} reason={reasonParam} mcpState={mcpState} />;
}
