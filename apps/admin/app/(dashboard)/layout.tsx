import { redirect } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .in("role", ["super_admin", "platform_admin"])
    .filter("removed_at", "is", "null")
    .maybeSingle();

  const appMetadataRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  const resolvedRole = roleRow?.role ?? appMetadataRole;
  const isAdmin =
    resolvedRole === "super_admin" || resolvedRole === "platform_admin";

  if (!isAdmin) {
    redirect("/login?error=admin_required");
  }

  return (
    <AdminSidebar
      email={user.email ?? ""}
      isSuperAdmin={resolvedRole === "super_admin"}
    >
      {children}
    </AdminSidebar>
  );
}
