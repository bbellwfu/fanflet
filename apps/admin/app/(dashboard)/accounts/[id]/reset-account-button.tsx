"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@fanflet/ui/alert-dialog";
import { resetAccountToNew } from "./actions";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export interface ResetAccountStats {
  fanfletsCount: number;
  subscriberCount: number;
  analyticsEventsCount: number;
}

interface ResetAccountButtonProps {
  speakerId: string;
  speakerName: string | null;
  stats: ResetAccountStats;
}

export function ResetAccountButton({
  speakerId,
  speakerName,
  stats,
}: ResetAccountButtonProps) {
  const [step, setStep] = useState<"idle" | "confirm-name" | "final">("idle");
  const [typedName, setTypedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalDialogOpen, setFinalDialogOpen] = useState(false);

  const displayName = speakerName ?? "Unnamed Speaker";
  const nameMatches =
    typedName.trim().toLowerCase() === displayName.trim().toLowerCase();

  function handleOpenStep1() {
    setStep("confirm-name");
    setTypedName("");
  }

  function handleCancelStep1() {
    setStep("idle");
    setTypedName("");
  }

  function handleContinueToFinal() {
    if (!nameMatches) return;
    setStep("idle");
    setTypedName("");
    setFinalDialogOpen(true);
  }

  async function handleConfirmReset() {
    setLoading(true);
    const result = await resetAccountToNew(speakerId);
    setLoading(false);
    setFinalDialogOpen(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Account reset to new status");
      window.location.reload();
    }
  }

  if (step === "confirm-name") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error/5 p-4 max-w-md">
        <p className="text-sm font-medium text-fg">
          Reset account to new status
        </p>
        <p className="text-[13px] text-fg-secondary">
          This will permanently delete all fanflets ({stats.fanfletsCount}),{" "}
          {stats.subscriberCount} subscribers, {stats.analyticsEventsCount}{" "}
          analytics events, resources, survey questions, and clear profile
          (photo, bio, slug). Auth and name are kept.
        </p>
        <p className="text-[13px] text-fg-secondary">
          Type the speaker&apos;s name to continue:
        </p>
        <Input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={displayName}
          className="border-border-subtle bg-page text-fg placeholder:text-fg-muted"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleContinueToFinal}
            disabled={!nameMatches || loading}
          >
            Continue
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancelStep1}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenStep1}
        className="border-border-subtle text-fg-secondary hover:text-fg"
      >
        <RotateCcw className="w-4 h-4 mr-1.5" />
        Reset Account
      </Button>
      <AlertDialog open={finalDialogOpen} onOpenChange={setFinalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. Reset {displayName}&apos;s account
              to new status? All fanflets, subscribers, resources, and profile
              data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default" disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={(e) => {
                e.preventDefault();
                handleConfirmReset();
              }}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
