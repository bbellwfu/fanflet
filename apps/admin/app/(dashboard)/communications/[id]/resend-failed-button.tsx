"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@fanflet/ui/button";
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
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
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
      // Server action revalidates path; router.refresh() can help if needed
      window.location.reload();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={isPending || failedCount === 0}
      className="gap-1.5"
    >
      <RefreshCwIcon
        className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
      />
      {isPending ? "Sending…" : `Resend to failed (${failedCount})`}
    </Button>
  );
}
