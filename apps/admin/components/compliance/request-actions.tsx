"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@fanflet/ui/dialog";
import { AlertTriangleIcon } from "lucide-react";
import {
  approveDeletionRequest,
  executeDeletionPipeline,
  retryDeletionStep,
  cancelDeletionRequest,
  rejectDeletionRequest,
} from "@/app/(dashboard)/compliance/actions";

interface RequestActionsProps {
  requestId: string;
  status: string;
  subjectEmail: string;
  failedStepId?: string;
}

export function RequestActions({ requestId, status, subjectEmail, failedStepId }: RequestActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveDeletionRequest(requestId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleExecute() {
    setError(null);
    setShowEraseConfirm(false);
    setTypedEmail("");
    startTransition(async () => {
      try {
        const result = await executeDeletionPipeline(requestId);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch (e) {
        setError((e as Error).message ?? "Pipeline execution failed");
      }
    });
  }

  function handleRetry() {
    if (!failedStepId) return;
    setError(null);
    startTransition(async () => {
      const result = await retryDeletionStep(failedStepId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleCancel() {
    if (!cancelReason.trim()) {
      setError("Cancellation reason is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelDeletionRequest(requestId, cancelReason);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      setError("Rejection reason is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectDeletionRequest(requestId, rejectReason);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  const isTerminal = status === "completed" || status === "cancelled" || status === "rejected";
  const emailMatch = typedEmail.trim().toLowerCase() === subjectEmail.toLowerCase();

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-md px-4 py-3 text-[13px] text-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <Button onClick={handleApprove} disabled={isPending} size="sm">
            {isPending ? "Approving..." : "Approve Request"}
          </Button>
        )}

        {status === "approved" && (
          <Button
            onClick={() => setShowEraseConfirm(true)}
            disabled={isPending}
            size="sm"
            className="bg-error text-white hover:bg-error/90"
          >
            {isPending ? "Erasing..." : "Proceed to Erase"}
          </Button>
        )}

        {status === "processing" && failedStepId && (
          <Button onClick={handleRetry} disabled={isPending} size="sm" variant="outline">
            {isPending ? "Retrying..." : "Retry Failed Step"}
          </Button>
        )}

        {(status === "pending" || status === "approved") && !showReject && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowReject(true); setShowCancel(false); }}
            className="text-warning border-warning/30 hover:bg-warning/10"
          >
            Reject Request
          </Button>
        )}

        {!isTerminal && !showCancel && !showReject && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancel(true)}
            className="text-error border-error/30 hover:bg-error/10"
          >
            Cancel Request
          </Button>
        )}
      </div>

      {/* Erase confirmation dialog */}
      <Dialog
        open={showEraseConfirm}
        onOpenChange={(v) => {
          setShowEraseConfirm(v);
          if (!v) setTypedEmail("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-error" />
              Confirm Permanent Erasure
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all data for{" "}
              <span className="font-medium text-fg">{subjectEmail}</span>,
              including fanflets, subscribers, resources, files, and the
              authentication account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-error/5 border border-error/20 rounded-md px-3 py-2.5 text-[13px] text-error">
            A data snapshot will be taken before deletion begins.
            All steps are logged for compliance audit.
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-fg">
              Type <span className="font-mono text-error">{subjectEmail}</span> to confirm
            </label>
            <input
              type="text"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              placeholder={subjectEmail}
              className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-error/30"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEraseConfirm(false);
                setTypedEmail("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={!emailMatch || isPending}
              className="bg-error text-white hover:bg-error/90 disabled:opacity-50"
            >
              {isPending ? "Erasing..." : "Erase All Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showReject && !isTerminal && (
        <div className="bg-warning/5 border border-warning/20 rounded-md p-4 space-y-3">
          <p className="text-[13px] font-medium text-fg">
            Reject this request? The account will be restored to active.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-warning/30 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isPending}
              className="text-warning border-warning/30 hover:bg-warning/10"
            >
              {isPending ? "Rejecting..." : "Confirm Reject"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowReject(false);
                setRejectReason("");
              }}
            >
              Nevermind
            </Button>
          </div>
        </div>
      )}

      {showCancel && !isTerminal && (
        <div className="bg-error/5 border border-error/20 rounded-md p-4 space-y-3">
          <p className="text-[13px] font-medium text-fg">
            Are you sure you want to cancel this request?
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation..."
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-error/30 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="text-error border-error/30 hover:bg-error/10"
            >
              {isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCancel(false);
                setCancelReason("");
              }}
            >
              Nevermind
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
