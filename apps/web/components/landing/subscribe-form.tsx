"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToSpeaker } from "@/app/[speakerSlug]/[fanfletSlug]/actions";
import { isPreviewMode, getSourceFromRef } from "./analytics-script";

/** SessionStorage key prefix for subscriber_id (suffix = fanfletId). Used by track API for lead attribution. */
export const SUBSCRIBER_ID_KEY_PREFIX = "fanflet_subscriber_id_";

type SubscribeFormProps = {
  speakerId: string;
  fanfletId: string;
  subscriberCount: number;
  /** When true, show the sponsor consent checkbox. */
  hasSponsorBlocks?: boolean;
};

export function SubscribeForm({
  speakerId,
  fanfletId,
  subscriberCount,
  hasSponsorBlocks = false,
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [sponsorConsent, setSponsorConsent] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already_subscribed" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage(null);

    const result = await subscribeToSpeaker(
      speakerId,
      fanfletId,
      email.trim(),
      hasSponsorBlocks ? sponsorConsent : false
    );

    if (result.success) {
      setStatus("success");
      setEmail("");
      if (result.subscriber_id && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            `${SUBSCRIBER_ID_KEY_PREFIX}${fanfletId}`,
            result.subscriber_id
          );
        } catch {
          // ignore storage errors
        }
      }

      if (!isPreviewMode()) {
        const source = getSourceFromRef();
        const payload = JSON.stringify({
          fanflet_id: fanfletId,
          event_type: "email_signup" as const,
          source,
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }).catch(() => {});
        }
      }
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

      {hasSponsorBlocks && (status === "idle" || status === "loading") && (
        <label className="flex items-start gap-2 cursor-pointer text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={sponsorConsent}
            onChange={(e) => setSponsorConsent(e.target.checked)}
            disabled={status === "loading"}
            aria-label="Share my info with event sponsors"
            className="mt-1 rounded border-slate-300 text-[#3BA5D9] focus:ring-[#3BA5D9]"
          />
          <span>
            I agree to share my name and email with sponsors whose content I
            engage with on this page.
          </span>
        </label>
      )}

      {status === "success" && (
        <p className="text-sm text-emerald-600 font-medium">
          You&apos;re subscribed! You&apos;ll hear from this speaker soon.
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
