"use server";

import { requireSponsor } from "@/lib/auth-context";
import { loadSponsorEntitlements } from "@fanflet/db";
import { blockImpersonationWrites } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";
import { logSponsorAudit } from "@/lib/sponsor-audit";

export async function inviteTeamMember(params: {
  email: string;
  role: "admin" | "campaign_manager" | "viewer";
}): Promise<{ error?: string }> {
  await blockImpersonationWrites();
  const { supabase, sponsorId, teamRole } = await requireSponsor();

  if (teamRole !== "owner" && teamRole !== "admin") {
    return { error: "Only admins can invite team members." };
  }

  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_multi_user_access")) {
    return { error: "Team access requires Sponsor Studio. Upgrade your plan." };
  }

  const maxUsers = entitlements.limits.max_users;
  if (typeof maxUsers === "number" && maxUsers !== -1) {
    const { count } = await supabase
      .from("sponsor_team_members")
      .select("id", { count: "exact", head: true })
      .eq("sponsor_id", sponsorId);
    // +1 for the owner
    if ((count ?? 0) + 1 >= maxUsers) {
      return {
        error: `You've reached the limit of ${maxUsers} user${maxUsers !== 1 ? "s" : ""} on your plan. Upgrade to Sponsor Studio for unlimited team members.`,
      };
    }
  }

  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Valid email is required." };
  }

  // Check not already invited (pending)
  const { data: existingInvite } = await supabase
    .from("sponsor_team_invitations")
    .select("id")
    .eq("sponsor_id", sponsorId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return { error: "An invitation is already pending for this email." };
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("sponsor_team_invitations")
    .insert({
      sponsor_id: sponsorId,
      email,
      role: params.role,
      invited_by: user!.id,
    });

  if (error) return { error: error.message };
  await logSponsorAudit(supabase, { sponsorId, actorId: user!.id, action: "invite_team_member", category: "team", targetType: "invitation", details: { email, role: params.role } });
  revalidatePath("/sponsor/settings/team");
  return {};
}

export async function removeTeamMember(memberId: string): Promise<{ error?: string }> {
  await blockImpersonationWrites();
  const { supabase, sponsorId, teamRole, user } = await requireSponsor();

  if (teamRole !== "owner" && teamRole !== "admin") {
    return { error: "Only admins can remove team members." };
  }

  const { error } = await supabase
    .from("sponsor_team_members")
    .delete()
    .eq("id", memberId)
    .eq("sponsor_id", sponsorId);

  if (error) return { error: error.message };
  await logSponsorAudit(supabase, { sponsorId, actorId: user.id, action: "remove_team_member", category: "team", targetType: "team_member", targetId: memberId });
  revalidatePath("/sponsor/settings/team");
  return {};
}

export async function updateTeamMemberRole(
  memberId: string,
  role: "admin" | "campaign_manager" | "viewer"
): Promise<{ error?: string }> {
  await blockImpersonationWrites();
  const { supabase, sponsorId, teamRole, user } = await requireSponsor();

  if (teamRole !== "owner" && teamRole !== "admin") {
    return { error: "Only admins can change roles." };
  }

  const { error } = await supabase
    .from("sponsor_team_members")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("sponsor_id", sponsorId);

  if (error) return { error: error.message };
  await logSponsorAudit(supabase, { sponsorId, actorId: user.id, action: "update_team_member_role", category: "team", targetType: "team_member", targetId: memberId, details: { role } });
  revalidatePath("/sponsor/settings/team");
  return {};
}

export async function revokeInvitation(invitationId: string): Promise<{ error?: string }> {
  await blockImpersonationWrites();
  const { supabase, sponsorId, teamRole, user } = await requireSponsor();

  if (teamRole !== "owner" && teamRole !== "admin") {
    return { error: "Only admins can revoke invitations." };
  }

  const { error } = await supabase
    .from("sponsor_team_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("sponsor_id", sponsorId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  await logSponsorAudit(supabase, { sponsorId, actorId: user.id, action: "revoke_invitation", category: "team", targetType: "invitation", targetId: invitationId });
  revalidatePath("/sponsor/settings/team");
  return {};
}
