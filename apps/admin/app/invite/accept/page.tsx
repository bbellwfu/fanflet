import { redirect } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { createHash } from "crypto";
import { AcceptInviteClient } from "./accept-invite-client";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface AcceptPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptPageProps) {
  const params = await searchParams;
  const rawToken = typeof params.token === "string" ? params.token : null;

  if (!rawToken) {
    return (
      <InviteLayout>
        <ErrorCard message="Invalid invitation link. Please check the link in your email." />
      </InviteLayout>
    );
  }

  const tokenHash = hashToken(rawToken);
  const supabase = createServiceClient();

  const { data: invite } = await supabase
    .from("admin_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .single();

  if (!invite) {
    return (
      <InviteLayout>
        <ErrorCard message="This invitation has already been used or does not exist." />
      </InviteLayout>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <InviteLayout>
        <ErrorCard message="This invitation has expired. Ask your admin to send a new one." />
      </InviteLayout>
    );
  }

  // Check if user is logged in
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (user) {
    // Already logged in — accept the invitation directly
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return (
        <InviteLayout>
          <ErrorCard
            message={`This invitation was sent to ${invite.email}. You are signed in as ${user.email}. Please sign out and sign in with the correct account.`}
          />
        </InviteLayout>
      );
    }

    // Accept: insert user_roles row
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        auth_user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
        invited_at: invite.created_at,
      });

    if (roleError && roleError.code !== "23505") {
      return (
        <InviteLayout>
          <ErrorCard message="Failed to activate your admin access. Please try again." />
        </InviteLayout>
      );
    }

    // Set app_metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { role: invite.role },
    });
    if (metadataError) {
      console.error("[invite/accept] updateUserById:", metadataError.message);
      return (
        <InviteLayout>
          <ErrorCard message="Failed to activate your admin access. Please try again." />
        </InviteLayout>
      );
    }

    // Mark invitation as accepted
    const { error: updateInviteError } = await supabase
      .from("admin_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (updateInviteError) {
      console.error("[invite/accept] mark accepted:", updateInviteError.message);
      // Role is already set; still redirect to dashboard
    }

    // Audit
    const { auditAdminAction } = await import("@/lib/audit");
    await auditAdminAction({
      adminId: user.id,
      action: "admin.accept_invite",
      category: "admin_management",
      targetType: "admin_invitation",
      targetId: invite.id,
      details: { role: invite.role, invitedBy: invite.invited_by },
    });

    redirect("/");
  }

  // Not logged in — show login prompt
  return (
    <InviteLayout>
      <AcceptInviteClient
        email={invite.email}
        role={invite.role as "super_admin" | "platform_admin"}
        token={rawToken}
      />
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-fg mb-2">Invitation Error</h2>
      <p className="text-sm text-fg-muted">{message}</p>
    </div>
  );
}
