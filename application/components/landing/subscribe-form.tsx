"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToSpeaker } from "@/app/[speakerSlug]/[fanfletSlug]/actions";

type SubscribeFormProps = {
  speakerId: string;
  fanfletId: string;
  subscriberCount: number;
};

export function SubscribeForm({
  speakerId,
  fanfletId,
  subscriberCount,
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already_subscribed" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage(null);

    const result = await subscribeToSpeaker(speakerId, fanfletId, email.trim());

    if (result.success) {
      setStatus("success");
      setEmail("");
    } else if (result.error === "already_subscribed") {
      setStatus("already_subscribed");
    } else {
      setStatus("error");
      setErrorMessage(result.error ?? "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          className="bg-slate-50 border-slate-200 text-sm h-10"
          required
          aria-label="Email address"
        />
        <Button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-white shrink-0 h-10 px-5 font-semibold text-sm"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </Button>
      </div>

      {status === "success" && (
        <p className="text-sm text-emerald-600 font-medium">
          You&apos;re subscribed! Check your inbox.
        </p>
      )}
      {status === "already_subscribed" && (
        <p className="text-sm text-amber-600 font-medium">
          You&apos;re already subscribed!
        </p>
      )}
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
      )}

      {status === "idle" || status === "loading" ? (
        <p className="text-[11px] text-muted-foreground">
          {subscriberCount === 0
            ? "Be the first to subscribe. No spam, ever."
            : `Join ${subscriberCount.toLocaleString()}+ subscribers. No spam, ever.`}
        </p>
      ) : null}
    </form>
  );
}
