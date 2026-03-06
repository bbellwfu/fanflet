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
import { toggleSuspension } from "./actions";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck, AlertTriangleIcon } from "lucide-react";

interface SuspendButtonProps {
  speakerId: string;
  currentStatus: string;
}

export function SuspendButton({ speakerId, currentStatus }: SuspendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const isSuspended = currentStatus === "suspended";

  async function handleConfirm() {
    setLoading(true);
    const result = await toggleSuspension(speakerId, currentStatus, reason || undefined);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isSuspended ? "Account reactivated" : "Account suspended");
      setOpen(false);
      setReason("");
    }
  }

  return (
    <>
      <Button
        variant={isSuspended ? "default" : "destructive"}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="cursor-pointer"
      >
        {isSuspended ? (
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
        ) : (
          <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
        )}
        {isSuspended ? "Reactivate" : "Suspend"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-warning" />
              {isSuspended ? "Reactivate Account" : "Suspend Account"}
            </DialogTitle>
            <DialogDescription>
              {isSuspended
                ? "This will restore the account to active status. The speaker will regain full access."
                : "This will mark the account as suspended. You can reactivate it at any time."}
            </DialogDescription>
          </DialogHeader>

          {!isSuspended && (
            <div className="py-2">
              <label
                htmlFor="suspend-reason"
                className="text-[13px] font-medium text-fg-muted block mb-1.5"
              >
                Reason (optional)
              </label>
              <input
                id="suspend-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Violation of terms of service"
                className="h-9 w-full rounded-lg border border-border-subtle bg-page px-3 text-[13px] text-fg outline-none placeholder:text-fg-muted focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-[3px]"
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={loading}
              className="cursor-pointer"
            >
              {isSuspended ? (
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              ) : (
                <ShieldOff className="w-3.5 h-3.5 mr-1" />
              )}
              {loading
                ? "Processing..."
                : isSuspended
                ? "Reactivate Account"
                : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
