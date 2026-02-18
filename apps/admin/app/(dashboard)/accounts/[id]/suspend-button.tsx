"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import { toggleSuspension } from "./actions";
import { toast } from "sonner";

interface SuspendButtonProps {
  speakerId: string;
  currentStatus: string;
}

export function SuspendButton({ speakerId, currentStatus }: SuspendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  const isSuspended = currentStatus === "suspended";

  async function handleAction() {
    if (!isSuspended && !showReason) {
      setShowReason(true);
      return;
    }

    setLoading(true);
    const result = await toggleSuspension(speakerId, currentStatus, reason || undefined);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isSuspended ? "Account reactivated" : "Account suspended");
      setShowReason(false);
      setReason("");
    }
  }

  if (showReason && !isSuspended) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Suspension reason (optional)"
          className="h-9 rounded-lg border border-border-subtle bg-page px-3 text-[13px] text-fg outline-none placeholder:text-fg-muted focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-[3px] w-64"
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleAction}
          disabled={loading}
        >
          {loading ? "Suspending..." : "Confirm Suspend"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReason(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={isSuspended ? "default" : "destructive"}
      size="sm"
      onClick={handleAction}
      disabled={loading}
    >
      {loading
        ? "Processing..."
        : isSuspended
        ? "Reactivate"
        : "Suspend"}
    </Button>
  );
}
