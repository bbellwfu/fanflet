import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SponsorSidebar } from "@/components/sponsor/sponsor-sidebar";

export default async function SponsorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sponsor/dashboard");
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, slug, logo_url, is_verified, contact_email")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active_role")?.value ?? "sponsor";

  return (
    <SponsorSidebar user={user} sponsor={sponsor} activeRole={activeRole}>
      {children}
    </SponsorSidebar>
  );
}
