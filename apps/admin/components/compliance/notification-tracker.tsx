"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";
import { CheckCircle2Icon, SendIcon } from "lucide-react";
import { markNotificationSent } from "@/app/(dashboard)/compliance/actions";

interface NotificationTrackerProps {
  requestId: string;
  subjectEmail: string;
  notificationEmail: string | null;
  notificationSentAt: string | null;
  notificationMethod: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  email: "Email",
  postal: "Postal mail",
  in_app: "In-app notification",
  other: "Other",
};

export function NotificationTracker({
  requestId,
  subjectEmail,
  notificationEmail,
  notificationSentAt,
  notificationMethod,
}: NotificationTrackerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(subjectEmail);
  const [method, setMethod] = useState("email");

  if (notificationSentAt) {
    return (
      <div className="flex items-start gap-3">
        <CheckCircle2Icon className="w-5 h-5 text-success mt-0.5 shrink-0" />
        <div className="text-[13px]">
          <p className="font-medium text-fg">Confirmation sent</p>
          <p className="text-fg-muted mt-0.5">
            Sent to <span className="font-medium text-fg">{notificationEmail}</span> via{" "}
            {METHOD_LABELS[notificationMethod ?? "email"] ?? notificationMethod} on{" "}
            {new Date(notificationSentAt).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await markNotificationSent({
        requestId,
        notificationEmail: email.trim().toLowerCase(),
        notificationMethod: method as "email" | "postal" | "in_app" | "other",
      });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-md px-3 py-2 text-[13px] text-error">
          {error}
        </div>
      )}

      <div className="bg-warning/5 border border-warning/20 rounded-md px-3 py-2.5 text-[13px] text-fg-secondary">
        The data subject has not been notified yet. Download the User Confirmation
        report above and send it to the subject, then record the notification here.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-[12px] font-medium text-fg-muted">Recipient email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="w-full sm:w-44 space-y-1">
          <label className="text-[12px] font-medium text-fg-muted">Method</label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-9 w-full bg-surface border-border-subtle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="postal">Postal mail</SelectItem>
              <SelectItem value="in_app">In-app</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !email.trim()}
            className="gap-1.5 h-9"
          >
            <SendIcon className="w-3.5 h-3.5" />
            {isPending ? "Recording..." : "Mark as Sent"}
          </Button>
        </div>
      </div>
    </div>
  );
}
