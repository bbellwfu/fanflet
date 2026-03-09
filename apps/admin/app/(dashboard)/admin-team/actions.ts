"use server";

import { createServiceClient } from "@fanflet/db/service";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { randomBytes, createHash } from "crypto";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const INVITE_EXPIRY_HOURS = 48;

const inviteAdminSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(["super_admin", "platform_admin"]),
});
const roleIdSchema = z.string().uuid();
const invitationIdSchema = z.string().uuid();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  role: "super_admin" | "platform_admin";
  created_at: string;
  invited_by_email: string | null;
  removed_at: string | null;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: "super_admin" | "platform_admin";
  invited_by_email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export async function getAdminTeam(): Promise<{
  admins: AdminUser[];
  invitations: AdminInvitation[];
  error?: string;
}> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { admins: [], invitations: [], error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .in("role", ["super_admin", "platform_admin"])
    .is("removed_at", null)
    .order("created_at", { ascending: true });

  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const userMap = new Map<string, { email: string }>();
  for (const u of users?.users ?? []) {
    userMap.set(u.id, { email: u.email ?? "" });
  }

  const admins: AdminUser[] = (roles ?? []).map((r) => ({
    id: r.id,
    auth_user_id: r.auth_user_id,
    email: userMap.get(r.auth_user_id)?.email ?? "",
    role: r.role as "super_admin" | "platform_admin",
    created_at: r.created_at,
    invited_by_email: r.invited_by ? (userMap.get(r.invited_by)?.email ?? null) : null,
    removed_at: r.removed_at,
  }));

  const { data: invites } = await supabase
    .from("admin_invitations")
    .select("*")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const invitations: AdminInvitation[] = (invites ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as "super_admin" | "platform_admin",
    invited_by_email: userMap.get(inv.invited_by)?.email ?? "",
    created_at: inv.created_at,
    expires_at: inv.expires_at,
    accepted_at: inv.accepted_at,
  }));

  return { admins, invitations };
}

/** Internal helper: create invitation row and send email. Does not audit. */
async function createInvitationCore(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  role: "super_admin" | "platform_admin",
  inviterAdminId: string,
  inviterEmail: string
): Promise<{ rawToken?: string; error?: string }> {
  const emailLower = email.toLowerCase();

  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existingUser = (users?.users ?? []).find(
    (u) => u.email?.toLowerCase() === emailLower
  );

  if (existingUser) {
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("auth_user_id", existingUser.id)
      .in("role", ["super_admin", "platform_admin"])
      .is("removed_at", null)
      .maybeSingle();

    if (existingRole) {
      return { error: "This user is already an admin" };
    }
  }

  const { data: pendingInvite } = await supabase
    .from("admin_invitations")
    .select("id")
    .eq("email", emailLower)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pendingInvite) {
    return { error: "An invitation is already pending for this email" };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  const { error: insertError } = await supabase
    .from("admin_invitations")
    .insert({
      email: emailLower,
      token_hash: tokenHash,
      invited_by: inviterAdminId,
      role,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("[admin-team] invite insert error:", insertError.message);
    return { error: "Failed to create invitation" };
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.fanflet.com";
  const acceptUrl = `${adminUrl}/invite/accept?token=${rawToken}`;
  const apiKey = process.env.RESEND_API_KEY;
  const safeInviterEmail = escapeHtml(inviterEmail || "");
  const roleLabel = role === "super_admin" ? "Super Admin" : "Admin";

  if (apiKey?.trim()) {
    try {
      const resend = new Resend(apiKey);
      const from = process.env.RESEND_FROM ?? "Fanflet <onboarding@resend.dev>";
      await resend.emails.send({
        from,
        to: [email],
        subject: "You've been invited to the Fanflet admin team",
        html: `<p>Hi,</p>
<p><strong>${safeInviterEmail}</strong> has invited you to join the Fanflet admin team as a <strong>${roleLabel}</strong>.</p>
<p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
<p style="color:#64748b;font-size:13px;">This invitation expires in ${INVITE_EXPIRY_HOURS} hours.</p>`,
      });
    } catch (err) {
      console.error("[admin-team] invitation email failed:", err);
    }
  }

  return { rawToken };
}

export async function inviteAdmin(
  email: string,
  role: "super_admin" | "platform_admin"
): Promise<{ error?: string }> {
  const parsed = inviteAdminSchema.safeParse({ email, role });
  if (!parsed.success) {
    return { error: "Invalid input" };
  }
  const { email: validEmail, role: validRole } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const result = await createInvitationCore(
    supabase,
    validEmail,
    validRole,
    admin.user.id,
    admin.user.email
  );
  if (result.error) return { error: result.error };

  await auditAdminAction({
    adminId: admin.user.id,
    action: "admin.invite",
    category: "admin_management",
    targetType: "admin_invitation",
    targetId: validEmail.toLowerCase(),
    details: { role: validRole },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/admin-team");
  return {};
}

export async function removeAdmin(roleId: string): Promise<{ error?: string }> {
  const parsed = roleIdSchema.safeParse(roleId);
  if (!parsed.success) return { error: "Invalid input" };
  const validRoleId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: targetRole } = await supabase
    .from("user_roles")
    .select("*")
    .eq("id", validRoleId)
    .is("removed_at", null)
    .single();

  if (!targetRole) {
    return { error: "Admin role not found" };
  }

  // Last super admin guard (application level, backed by DB trigger)
  if (targetRole.role === "super_admin") {
    const { count } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .is("removed_at", null);

    if ((count ?? 0) <= 1) {
      return { error: "Cannot remove the last super admin. Promote another admin first." };
    }
  }

  const { error: updateError } = await supabase
    .from("user_roles")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", validRoleId);

  if (updateError) {
    console.error("[admin-team] remove error:", updateError.message);
    return { error: "Failed to remove admin" };
  }

  // Remove app_metadata role and sign out
  try {
    await supabase.auth.admin.updateUserById(targetRole.auth_user_id, {
      app_metadata: { role: null },
    });
    await supabase.auth.admin.signOut(targetRole.auth_user_id);
  } catch (err) {
    console.error("[admin-team] cleanup error:", err);
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "admin.remove",
    category: "admin_management",
    targetType: "admin",
    targetId: targetRole.auth_user_id,
    details: { removedRole: targetRole.role },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/admin-team");
  return {};
}

export async function promoteAdmin(roleId: string): Promise<{ error?: string }> {
  const parsed = roleIdSchema.safeParse(roleId);
  if (!parsed.success) return { error: "Invalid input" };
  const validRoleId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: targetRole } = await supabase
    .from("user_roles")
    .select("*")
    .eq("id", validRoleId)
    .is("removed_at", null)
    .single();

  if (!targetRole) return { error: "Admin role not found" };
  if (targetRole.role === "super_admin") return { error: "Already a super admin" };

  const { error } = await supabase
    .from("user_roles")
    .update({ role: "super_admin" })
    .eq("id", validRoleId);

  if (error) return { error: "Failed to promote" };

  try {
    await supabase.auth.admin.updateUserById(targetRole.auth_user_id, {
      app_metadata: { role: "super_admin" },
    });
  } catch (err) {
    console.error("[admin-team] promote metadata update error:", err);
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "admin.promote",
    category: "admin_management",
    targetType: "admin",
    targetId: targetRole.auth_user_id,
    details: { fromRole: "platform_admin", toRole: "super_admin" },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/admin-team");
  return {};
}

export async function demoteAdmin(roleId: string): Promise<{ error?: string }> {
  const parsed = roleIdSchema.safeParse(roleId);
  if (!parsed.success) return { error: "Invalid input" };
  const validRoleId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: targetRole } = await supabase
    .from("user_roles")
    .select("*")
    .eq("id", validRoleId)
    .is("removed_at", null)
    .single();

  if (!targetRole) return { error: "Admin role not found" };
  if (targetRole.role !== "super_admin") return { error: "Not a super admin" };

  // Last super admin guard
  const { count } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .is("removed_at", null);

  if ((count ?? 0) <= 1) {
    return { error: "Cannot demote the last super admin. Promote another admin first." };
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ role: "platform_admin" })
    .eq("id", validRoleId);

  if (error) return { error: "Failed to demote" };

  try {
    await supabase.auth.admin.updateUserById(targetRole.auth_user_id, {
      app_metadata: { role: "platform_admin" },
    });
  } catch (err) {
    console.error("[admin-team] demote metadata update error:", err);
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "admin.demote",
    category: "admin_management",
    targetType: "admin",
    targetId: targetRole.auth_user_id,
    details: { fromRole: "super_admin", toRole: "platform_admin" },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/admin-team");
  return {};
}

export async function revokeInvitation(invitationId: string): Promise<{ error?: string }> {
  const parsed = invitationIdSchema.safeParse(invitationId);
  if (!parsed.success) return { error: "Invalid input" };
  const validInvitationId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: invite } = await supabase
    .from("admin_invitations")
    .select("email, role")
    .eq("id", validInvitationId)
    .is("accepted_at", null)
    .single();

  if (!invite) return { error: "Invitation not found" };

  const { error } = await supabase
    .from("admin_invitations")
    .delete()
    .eq("id", validInvitationId);

  if (error) return { error: "Failed to revoke" };

  await auditAdminAction({
    adminId: admin.user.id,
    action: "admin.revoke_invite",
    category: "admin_management",
    targetType: "admin_invitation",
    targetId: invite.email,
    details: { role: invite.role },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/admin-team");
  return {};
}

export async function resendInvitation(invitationId: string): Promise<{ error?: string }> {
  const parsed = invitationIdSchema.safeParse(invitationId);
  if (!parsed.success) return { error: "Invalid input" };
  const validInvitationId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: oldInvite } = await supabase
    .from("admin_invitations")
    .select("email, role")
    .eq("id", validInvitationId)
    .is("accepted_at", null)
    .single();

  if (!oldInvite) return { error: "Invitation not found" };

  const { error: deleteError } = await supabase
    .from("admin_invitations")
    .delete()
    .eq("id", validInvitationId);
  if (deleteError) {
    console.error("[admin-team] resend delete error:", deleteError.message);
    return { error: "Failed to revoke previous invitation" };
  }

  const result = await createInvitationCore(
    supabase,
    oldInvite.email,
    oldInvite.role as "super_admin" | "platform_admin",
    admin.user.id,
    admin.user.email
  );
  if (result.error) return { error: result.error };

  await auditAdminAction({
    adminId: admin.user.id,
    action: "admin.resend_invite",
    category: "admin_management",
    targetType: "admin_invitation",
    targetId: oldInvite.email,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/admin-team");
  return {};
}

export async function getSuperAdminCount(): Promise<number> {
  try {
    await requireSuperAdmin();
  } catch {
    return 0;
  }
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .is("removed_at", null);
  return count ?? 0;
}
