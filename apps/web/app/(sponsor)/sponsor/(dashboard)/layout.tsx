import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SponsorSidebar } from "@/components/sponsor/sponsor-sidebar";
import { TimezoneProvider } from "@/lib/timezone-context";
import { SessionMonitor } from "@/components/auth/session-monitor";

export const dynamic = "force-dynamic";

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

  // Check direct ownership first
  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, slug, logo_url, is_verified, contact_email, timezone, speaker_label")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!sponsor) {
    // Check team membership before redirecting to onboarding
    const { data: membership } = await supabase
      .from("sponsor_team_members")
      .select("sponsor_id, role, sponsor_accounts(id, company_name, slug, logo_url, is_verified, contact_email, timezone, speaker_label)")
      .eq("auth_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      redirect("/sponsor/onboarding");
    }

    const teamSponsor = membership.sponsor_accounts as unknown as {
      id: string;
      company_name: string;
      slug: string;
      logo_url: string | null;
      is_verified: boolean;
      contact_email: string;
      timezone: string | null;
      speaker_label: string | null;
    };
    if (!teamSponsor) {
      redirect("/sponsor/onboarding");
    }

    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active_role")?.value ?? "sponsor";

    return (
      <TimezoneProvider timezone={teamSponsor.timezone ?? null}>
        <SessionMonitor />
        <SponsorSidebar user={user} sponsor={teamSponsor} activeRole={activeRole}>
          {children}
        </SponsorSidebar>
      </TimezoneProvider>
    );
  }

  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active_role")?.value ?? "sponsor";

  return (
    <TimezoneProvider timezone={sponsor.timezone ?? null}>
      <SessionMonitor />
      <SponsorSidebar user={user} sponsor={sponsor} activeRole={activeRole}>
        {children}
      </SponsorSidebar>
    </TimezoneProvider>
  );
}
