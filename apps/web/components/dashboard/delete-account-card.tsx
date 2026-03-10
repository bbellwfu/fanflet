"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangleIcon, Trash2Icon } from "lucide-react";
import { requestAccountDeletion } from "@/app/dashboard/settings/deletion-actions";

interface DeleteAccountCardProps {
  userEmail: string;
  pendingRequest: {
    status: string;
    createdAt: string;
  } | null;
}

export function DeleteAccountCard({ userEmail, pendingRequest }: DeleteAccountCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const emailMatch = typedEmail.trim().toLowerCase() === userEmail.toLowerCase();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await requestAccountDeletion();
      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
        setOpen(false);
        setTypedEmail("");
        router.refresh();
      }
    });
  }

  if (pendingRequest) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5" />
            Account Deletion Requested
          </CardTitle>
          <CardDescription className="text-red-800/70">
            Your account deletion request was submitted on{" "}
            {new Date(pendingRequest.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            . Our team is reviewing it and will process it in accordance with applicable
            data protection regulations (typically within 30 days).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800/60">
            If you did not make this request or wish to cancel it, please contact us
            at <a href="mailto:support@fanflet.com" className="underline font-medium">support@fanflet.com</a>.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-green-900">Deletion Request Submitted</CardTitle>
          <CardDescription className="text-green-800/70">
            Your account deletion request has been submitted. We will review and process
            it in accordance with applicable data protection regulations, typically within
            30 days. You will receive a confirmation when the process is complete.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-[#e2e8f0]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#1B365D]">
            Permanently delete all my data
          </CardTitle>
          <CardDescription className="text-xs">
            This is different from closing your account. This exercises your right
            to erasure under data protection regulations (GDPR, CCPA). All your
            data will be permanently and irreversibly deleted from our systems,
            including your profile, fanflets, subscribers, files, and analytics.
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-red-700 hover:bg-red-50 text-xs"
          >
            <Trash2Icon className="w-3.5 h-3.5 mr-1.5" />
            Request data erasure
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setTypedEmail("");
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangleIcon className="w-5 h-5 text-red-600" />
              Delete Your Account
            </DialogTitle>
            <DialogDescription>
              This will submit a request to permanently delete your account and
              all associated data, including:
            </DialogDescription>
          </DialogHeader>

          <ul className="text-sm text-muted-foreground space-y-1 pl-4">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              Your speaker profile and biography
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              All fanflets and resource pages
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              Subscriber records and email signups
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              Uploaded files, documents, and images
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              Analytics data and survey responses
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              Your login credentials
            </li>
          </ul>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2.5 text-sm text-red-700">
            Our team will review and process your request within 30 days.
            You will receive a confirmation at your email address when the
            deletion is complete.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Type <span className="font-mono text-red-600">{userEmail}</span> to confirm
            </label>
            <input
              type="text"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              placeholder={userEmail}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-300"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setTypedEmail("");
                setError(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!emailMatch || isPending}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Submitting..." : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
