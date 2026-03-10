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
import { ShieldCheckIcon } from "lucide-react";
import { restoreAccountToActive } from "@/app/(dashboard)/compliance/actions";

interface RestoreAccountButtonProps {
  speakerEmail: string;
  speakerName: string;
}

export function RestoreAccountButton({
  speakerEmail,
  speakerName,
}: RestoreAccountButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const displayName = speakerName || "this speaker";

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      const result = await restoreAccountToActive(speakerEmail);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-success border-success/30 hover:bg-success/10"
      >
        <ShieldCheckIcon className="w-3.5 h-3.5 mr-1.5" />
        Restore to Active
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-success" />
              Restore Account
            </DialogTitle>
            <DialogDescription>
              This will restore{" "}
              <span className="font-medium text-fg">{displayName}</span>{" "}
              ({speakerEmail}) to active status. Any open deletion requests for
              this account will be automatically rejected.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-md px-3 py-2 text-[13px] text-error">
              {error}
            </div>
          )}

          <div className="bg-success/5 border border-success/20 rounded-md px-3 py-2.5 text-[13px] text-fg-secondary">
            <p>The account status will change from <strong className="text-error">Pending Delete</strong> to <strong className="text-success">Active</strong>.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRestore}
              disabled={isPending}
              className="bg-success text-white hover:bg-success/90"
            >
              {isPending ? "Restoring..." : "Restore to Active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
