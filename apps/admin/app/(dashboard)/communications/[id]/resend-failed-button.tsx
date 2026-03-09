"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@fanflet/ui/button";
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
import { RefreshCwIcon } from "lucide-react";
import { resendFailedRecipients } from "../actions";

interface ResendFailedButtonProps {
  communicationId: string;
  failedCount: number;
}

export function ResendFailedButton({
  communicationId,
  failedCount,
}: ResendFailedButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    setOpen(false);
    startTransition(async () => {
      const result = await resendFailedRecipients(communicationId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.sentCount !== undefined
          ? `Resent to ${result.sentCount} recipient${result.sentCount === 1 ? "" : "s"}`
          : "Resend complete"
      );
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending || failedCount === 0}
        className="gap-1.5"
      >
        <RefreshCwIcon
          className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
        />
        {isPending ? "Sending…" : `Resend to failed (${failedCount})`}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend to failed recipients only?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the email only to the {failedCount} recipient{failedCount === 1 ? "" : "s"} who have not received it yet. Anyone who already got this communication will not be emailed again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResend();
              }}
              disabled={isPending}
            >
              {isPending ? "Sending…" : "Resend to failed only"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
