"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@fanflet/ui/dialog";
import { EyeIcon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";

interface ImpersonateButtonProps {
  targetUserId: string;
  targetRole: "speaker" | "sponsor";
  targetName: string;
  targetEmail: string;
  defaultReason?: string;
  defaultWriteEnabled?: boolean;
}

export function ImpersonateButton({
  targetUserId,
  targetRole,
  targetName,
  targetEmail,
  defaultReason = "",
  defaultWriteEnabled = false,
}: ImpersonateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason);
  const [writeEnabled, setWriteEnabled] = useState(defaultWriteEnabled);

  async function handleImpersonate() {
    setLoading(true);
    try {
      const res = await fetch("/api/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          targetRole,
          reason: reason.trim() || undefined,
          writeEnabled,
          returnPath: window.location.pathname,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start impersonation");
        return;
      }

      window.open(data.redirectUrl, "_blank");
      setOpen(false);
      setReason(defaultReason);
      setWriteEnabled(defaultWriteEnabled);
    } catch {
      toast.error("Failed to start impersonation session");
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = targetRole === "speaker" ? "Speaker" : "Sponsor";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="cursor-pointer bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300"
      >
        <EyeIcon className="w-3.5 h-3.5 mr-1.5" />
        View as {roleLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
              Impersonate {roleLabel}
            </DialogTitle>
            <DialogDescription>
              You are about to view the platform as{" "}
              <span className="font-medium text-fg">{targetName}</span>{" "}
              ({targetEmail}). This session expires in 1 hour and all activity
              will be logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="impersonate-reason"
                className="text-[13px] font-medium text-fg-muted block mb-1.5"
              >
                Reason (recommended)
              </label>
              <input
                id="impersonate-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Investigating bug report #123"
                className="h-9 w-full rounded-lg border border-border-subtle bg-page px-3 text-[13px] text-fg outline-none placeholder:text-fg-muted focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-[3px]"
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2.5 text-[13px] text-fg-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={writeEnabled}
                onChange={(e) => setWriteEnabled(e.target.checked)}
                className="rounded border-border-subtle cursor-pointer"
              />
              Enable write access (allows making changes as this user)
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setReason(defaultReason);
                setWriteEnabled(defaultWriteEnabled);
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImpersonate}
              disabled={loading}
              className="cursor-pointer bg-amber-500 text-white hover:bg-amber-600"
            >
              <EyeIcon className="w-3.5 h-3.5 mr-1" />
              {loading ? "Starting..." : "Start Impersonation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
