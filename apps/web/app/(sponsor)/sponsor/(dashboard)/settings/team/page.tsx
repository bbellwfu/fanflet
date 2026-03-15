import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadSponsorEntitlements } from "@fanflet/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Users } from "lucide-react";
import Link from "next/link";
import { TeamManagement } from "./team-management";

export default async function SponsorTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/settings/team");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Check team membership if not owner
  let sponsorId: string;
  let isOwner = false;

  if (sponsor) {
    sponsorId = sponsor.id;
    isOwner = true;
  } else {
    const { data: membership } = await supabase
      .from("sponsor_team_members")
      .select("sponsor_id, role")
      .eq("auth_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) redirect("/sponsor/onboarding");
    sponsorId = membership.sponsor_id;
    isOwner = false;

    if (membership.role !== "admin") {
      return (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Team</h1>
            <p className="text-muted-foreground mt-1">Only admins can manage team members.</p>
          </div>
        </div>
      );
    }
  }

  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  const hasTeamAccess = entitlements.features.has("sponsor_multi_user_access");

  if (!hasTeamAccess) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Team</h1>
          <p className="text-muted-foreground mt-1">Invite team members to collaborate on your sponsor account.</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">Sponsor Studio feature</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Multi-user team access is available on Sponsor Studio. Upgrade to invite team members with role-based permissions.
            </p>
            <Link
              href="/sponsor/billing"
              className="mt-4 inline-flex items-center rounded-md bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#152b4d]"
            >
              View plans
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch team members and pending invitations
  const [{ data: members }, { data: invitations }, { data: ownerAccount }] = await Promise.all([
    supabase
      .from("sponsor_team_members")
      .select("id, auth_user_id, role, created_at")
      .eq("sponsor_id", sponsorId)
      .order("created_at", { ascending: true }),
    supabase
      .from("sponsor_team_invitations")
      .select("id, email, role, status, created_at, expires_at")
      .eq("sponsor_id", sponsorId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("sponsor_accounts")
      .select("auth_user_id, contact_email")
      .eq("id", sponsorId)
      .single(),
  ]);

  // Resolve member emails
  const memberList = (members ?? []).map((m) => ({
    id: m.id,
    authUserId: m.auth_user_id,
    role: m.role as "admin" | "campaign_manager" | "viewer",
    createdAt: m.created_at,
    email: "", // will be populated client-side or via separate lookup
  }));

  const pendingInvitations = (invitations ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role as "admin" | "campaign_manager" | "viewer",
    expiresAt: i.expires_at,
  }));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Team
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage who has access to your sponsor account. Invite team members with role-based permissions.
        </p>
      </div>

      <TeamManagement
        members={memberList}
        pendingInvitations={pendingInvitations}
        ownerEmail={ownerAccount?.contact_email ?? ""}
        isOwner={isOwner}
      />
    </div>
  );
}
