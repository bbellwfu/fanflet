"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crown, Mail, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { inviteTeamMember, removeTeamMember, updateTeamMemberRole, revokeInvitation } from "./actions";

interface Member {
  id: string;
  authUserId: string;
  role: "admin" | "campaign_manager" | "viewer";
  createdAt: string;
  email: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: "admin" | "campaign_manager" | "viewer";
  expiresAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  campaign_manager: "Campaign Manager",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access — manage team, campaigns, resources, and settings",
  campaign_manager: "Create and manage campaigns and resources",
  viewer: "View-only access to dashboard, analytics, and leads",
};

interface TeamManagementProps {
  members: Member[];
  pendingInvitations: PendingInvitation[];
  ownerEmail: string;
  isOwner: boolean;
}

export function TeamManagement({ members, pendingInvitations, ownerEmail, isOwner }: TeamManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "campaign_manager" | "viewer">("viewer");

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    startTransition(async () => {
      const result = await inviteTeamMember({ email: inviteEmail, role: inviteRole });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
      }
    });
  };

  const handleRemove = (memberId: string) => {
    startTransition(async () => {
      const result = await removeTeamMember(memberId);
      if (result.error) toast.error(result.error);
      else toast.success("Team member removed");
    });
  };

  const handleRoleChange = (memberId: string, role: "admin" | "campaign_manager" | "viewer") => {
    startTransition(async () => {
      const result = await updateTeamMemberRole(memberId, role);
      if (result.error) toast.error(result.error);
      else toast.success("Role updated");
    });
  };

  const handleRevoke = (invitationId: string) => {
    startTransition(async () => {
      const result = await revokeInvitation(invitationId);
      if (result.error) toast.error(result.error);
      else toast.success("Invitation revoked");
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Send an invitation to join your sponsor account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="campaign_manager">Campaign Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={isPending || !inviteEmail.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
          <div className="mt-3 space-y-1">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
              <p key={role} className="text-xs text-muted-foreground">
                <span className="font-medium">{ROLE_LABELS[role]}:</span> {desc}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length + 1} member{members.length !== 0 ? "s" : ""} on this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {/* Owner row */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-medium">{ownerEmail}</p>
                  <p className="text-xs text-muted-foreground">Account owner</p>
                </div>
              </div>
              <Badge variant="secondary">Owner</Badge>
            </div>

            {/* Team members */}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-600">
                      {m.email ? m.email[0].toUpperCase() : "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.email || m.authUserId.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <>
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleRoleChange(m.id, v as typeof m.role)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="campaign_manager">Campaign Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemove(m.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations waiting to be accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role]} — expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
