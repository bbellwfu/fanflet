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
import { Trash2Icon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { createDeletionRequest } from "@/app/(dashboard)/compliance/actions";

interface DeleteAccountButtonProps {
  speakerEmail: string;
  speakerName: string | null;
}

export function DeleteAccountButton({
  speakerEmail,
  speakerName,
}: DeleteAccountButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");

  const displayName = speakerName ?? speakerEmail;
  const emailMatches =
    typedEmail.trim().toLowerCase() === speakerEmail.trim().toLowerCase();

  function handleCreate() {
    if (!emailMatches) return;

    startTransition(async () => {
      const result = await createDeletionRequest({
        subjectEmail: speakerEmail,
        subjectType: "speaker",
        requestType: "erasure",
        source: "admin_initiated",
        sourceReference: `Initiated from account detail page for ${displayName}`,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data?.id) {
        setOpen(false);
        setTypedEmail("");
        toast.success("Deletion request created");
        router.push(`/compliance/${result.data.id}`);
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="cursor-pointer border-error/30 text-error hover:bg-error/10 hover:text-error"
      >
        <Trash2Icon className="w-3.5 h-3.5 mr-1.5" />
        Delete Account
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTypedEmail(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-error" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This creates a data subject deletion request for{" "}
              <span className="font-medium text-fg">{displayName}</span>{" "}
              ({speakerEmail}). Once approved and executed, all account data
              including fanflets, subscribers, resources, files, and the auth
              user will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-error/20 bg-error/5 px-4 py-3">
              <p className="text-[13px] text-error font-medium mb-1">
                This action cannot be undone
              </p>
              <p className="text-[12px] text-fg-secondary">
                The deletion pipeline will remove all fanflets, subscribers,
                resources, analytics data, uploaded files, and the
                authentication account.
              </p>
            </div>

            <div>
              <label
                htmlFor="delete-confirm-email"
                className="text-[13px] font-medium text-fg-muted block mb-1.5"
              >
                Type the account email to confirm
              </label>
              <input
                id="delete-confirm-email"
                type="email"
                value={typedEmail}
                onChange={(e) => setTypedEmail(e.target.value)}
                placeholder={speakerEmail}
                className="h-9 w-full rounded-lg border border-border-subtle bg-page px-3 text-[13px] text-fg outline-none placeholder:text-fg-muted focus-visible:border-error focus-visible:ring-error/40 focus-visible:ring-[3px]"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setTypedEmail("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!emailMatches || isPending}
              className="cursor-pointer bg-error text-white hover:bg-error/90"
            >
              <Trash2Icon className="w-3.5 h-3.5 mr-1" />
              {isPending ? "Creating..." : "Create Deletion Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
