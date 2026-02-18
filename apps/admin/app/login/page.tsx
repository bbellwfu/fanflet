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

  // If Supabase redirected here with a code (shouldn't normally happen, but handle it),
  // send it to the Route Handler which CAN set cookies.
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();

  // If user is signed in but lacks admin access, sign them out to break the redirect loop.
  if (errorParam === "admin_required") {
    await supabase.auth.signOut();
    return <LoginForm error={errorParam} />;
  }

  // If the user is already signed in as an admin, redirect to the dashboard
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
      if (role === "platform_admin") {
        redirect("/");
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .eq("role", "platform_admin")
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

  return <LoginForm error={errorParam} />;
}
