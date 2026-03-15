"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { requestPlanChange } from "@/app/dashboard/billing/actions";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlanId: string;
  targetPlanName: string;
  targetPlanDisplayName: string;
  currentPlanDisplayName: string;
  isUpgrade: boolean;
}

export function UpgradeModal({
  open,
  onOpenChange,
  targetPlanId,
  targetPlanDisplayName,
  currentPlanDisplayName,
  isUpgrade,
}: UpgradeModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await requestPlanChange(targetPlanId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          onOpenChange(false);
          setSuccess(false);
        }, 1500);
      }
    });
  }

  function handleClose(v: boolean) {
    if (!v) {
      setError(null);
      setSuccess(false);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1B365D]">
            {isUpgrade ? "Upgrade" : "Change"} your plan
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? `You're upgrading from ${currentPlanDisplayName} to ${targetPlanDisplayName}.`
              : `You're switching from ${currentPlanDisplayName} to ${targetPlanDisplayName}.`}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-medium text-emerald-900">
              You&apos;re now on {targetPlanDisplayName}!
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-[#e2e8f0] bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{currentPlanDisplayName}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-[#1B365D]">{targetPlanDisplayName}</span>
              </div>
              {!isUpgrade && (
                <div className="flex items-start gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Downgrading may reduce your feature access. Existing content will be preserved
                    but some features may become unavailable.
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                During Early Access, all plan changes are free. No credit card required.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPending}
                className={
                  isUpgrade
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-[#1B365D] hover:bg-[#1B365D]/90 text-white"
                }
              >
                {isPending
                  ? "Switching..."
                  : isUpgrade
                    ? `Upgrade to ${targetPlanDisplayName}`
                    : `Switch to ${targetPlanDisplayName}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
