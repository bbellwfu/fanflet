"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InterestTier = "pro" | "enterprise" | "";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [interestTier, setInterestTier] = useState<InterestTier>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage(null);

    const body: { email: string; interest_tier?: "pro" | "enterprise" } = { email: email.trim() };
    if (interestTier === "pro" || interestTier === "enterprise") body.interest_tier = interestTier;

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      setStatus("success");
      setEmail("");
    } else {
      setStatus("error");
      setErrorMessage(data.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto sm:mx-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
            className="flex-1 min-w-0 bg-white border-slate-200 text-slate-900"
            required
            aria-label="Email for updates"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={status === "loading" || status === "success"}
            className="shrink-0"
          >
            {status === "loading" ? "Subscribing…" : status === "success" ? "Subscribed" : "Subscribe for Updates"}
          </Button>
        </div>
        <label className="text-[12px] text-white/70">
          Interested in a specific tier?
          <select
            value={interestTier}
            onChange={(e) => setInterestTier(e.target.value as InterestTier)}
            disabled={status === "loading" || status === "success"}
            className="ml-2 bg-white/10 border border-white/20 rounded px-2 py-1 text-slate-900 bg-white"
            aria-label="Tier interest (optional)"
          >
            <option value="">Just notify me</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise / Custom</option>
          </select>
        </label>
      </div>
      {status === "success" && (
        <p className="text-sm text-emerald-600 font-medium">
          You&apos;re on the list. We&apos;ll notify you when we announce new features and plans.
        </p>
      )}
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-600 font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
