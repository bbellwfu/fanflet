"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";
import {
  AlertTriangleIcon,
  PlusIcon,
  ShieldIcon,
  ShieldAlertIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SendIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import type { AdminUser, AdminInvitation } from "./actions";
import {
  inviteAdmin,
  removeAdmin,
  promoteAdmin,
  demoteAdmin,
  revokeInvitation,
  resendInvitation,
} from "./actions";

interface AdminTeamDashboardProps {
  admins: AdminUser[];
  invitations: AdminInvitation[];
  superAdminCount: number;
}

export function AdminTeamDashboard({
  admins,
  invitations,
  superAdminCount,
}: AdminTeamDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"platform_admin" | "super_admin">("platform_admin");
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  async function handleAction(
    action: () => Promise<{ error?: string }>,
    successMsg?: string
  ) {
    setActionError(null);
    const result = await action();
    if (result.error) {
      setActionError(result.error);
    } else {
      if (successMsg) setActionError(null);
      startTransition(() => router.refresh());
    }
  }

  async function handleInvite() {
    await handleAction(() => inviteAdmin(inviteEmail.trim(), inviteRole));
    setInviteEmail("");
    setShowInvite(false);
  }

  async function handleRemove(roleId: string) {
    await handleAction(() => removeAdmin(roleId));
    setConfirmRemoveId(null);
  }

  return (
    <div className="space-y-8">
      {/* Last super admin warning */}
      {superAdminCount <= 1 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              You are the only super admin
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Promote another admin to super admin to prevent being locked out if your account becomes unavailable.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Admins */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-fg">
            Active Admins ({admins.length})
          </h2>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <PlusIcon className="w-4 h-4 mr-1.5" />
            Invite Admin
          </Button>
        </div>

        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-elevated">
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Email</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Role</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Added</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Invited By</th>
                <th className="text-right px-4 py-3 font-medium text-fg-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const isSuperAdmin = admin.role === "super_admin";
                const isLastSuperAdmin = isSuperAdmin && superAdminCount <= 1;
                const isConfirming = confirmRemoveId === admin.id;

                return (
                  <tr key={admin.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-3 text-fg font-medium">{admin.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={admin.role} />
                    </td>
                    <td className="px-4 py-3 text-fg-secondary text-xs">
                      {formatDate(admin.created_at)}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary text-xs">
                      {admin.invited_by_email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isSuperAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(() => demoteAdmin(admin.id))}
                            disabled={isPending || isLastSuperAdmin}
                            title={isLastSuperAdmin ? "Cannot demote the last super admin" : "Demote to Admin"}
                            className="text-xs"
                          >
                            <ArrowDownIcon className="w-3.5 h-3.5 mr-1" />
                            Demote
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(() => promoteAdmin(admin.id))}
                            disabled={isPending}
                            title="Promote to Super Admin"
                            className="text-xs"
                          >
                            <ArrowUpIcon className="w-3.5 h-3.5 mr-1" />
                            Promote
                          </Button>
                        )}

                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemove(admin.id)}
                              disabled={isPending}
                              className="text-xs"
                            >
                              {isPending ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmRemoveId(null)}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRemoveId(admin.id)}
                            disabled={isPending || isLastSuperAdmin}
                            title={isLastSuperAdmin ? "Cannot remove the last super admin" : "Remove admin access"}
                            className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-fg mb-4">
            Pending Invitations ({invitations.length})
          </h2>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-elevated">
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Invited By</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Expires</th>
                  <th className="text-right px-4 py-3 font-medium text-fg-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-3 text-fg font-medium">{inv.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={inv.role} />
                    </td>
                    <td className="px-4 py-3 text-fg-secondary text-xs">{inv.invited_by_email}</td>
                    <td className="px-4 py-3 text-fg-secondary text-xs">{formatDate(inv.expires_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(() => resendInvitation(inv.id))}
                          disabled={isPending}
                          className="text-xs"
                        >
                          <SendIcon className="w-3.5 h-3.5 mr-1" />
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(() => revokeInvitation(inv.id))}
                          disabled={isPending}
                          className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <XIcon className="w-3.5 h-3.5 mr-1" />
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invite Dialog */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-fg mb-4">Invite Admin</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-fg-secondary">Email Address</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-fg-secondary">Role</label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as "platform_admin" | "super_admin")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-fg-muted mt-1">
                  {inviteRole === "super_admin"
                    ? "Super admins can manage the admin team, change plans, and view the audit log."
                    : "Admins can manage accounts, sponsors, communications, and use impersonation."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowInvite(false); setInviteEmail(""); }}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.includes("@") || isPending}
              >
                {isPending ? <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "super_admin" | "platform_admin" }) {
  if (role === "super_admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <ShieldAlertIcon className="w-3 h-3" />
        Super Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <ShieldIcon className="w-3 h-3" />
      Admin
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
