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

  // Check admin role: user_roles table is canonical; fall back to app_metadata for OAuth users.
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  const appMetadataRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  const isAdmin = roleRow != null || appMetadataRole === "platform_admin";

  if (!isAdmin) {
    redirect("/login?error=admin_required");
  }

  return (
    <AdminSidebar email={user.email ?? ""}>
      {children}
    </AdminSidebar>
  );
}
