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

  return (
    <AdminSidebar email={user.email ?? ""}>
      {children}
    </AdminSidebar>
  );
}
