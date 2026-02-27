"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Check } from "lucide-react";

interface SmsBookmarkFormProps {
  fanfletId: string;
}

export function SmsBookmarkForm({ fanfletId }: SmsBookmarkFormProps) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fanflet_id: fanfletId, phone: phone.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message);
        setPhone("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Unable to send. Please try again.");
    }
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-900 to-[var(--theme-primary)] text-white">
      <CardContent className="py-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--theme-accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
            {status === "success" ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Smartphone className="h-4 w-4 text-[var(--theme-accent)]" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {status === "success" ? "Link sent!" : "Bookmark this page"}
            </h3>
            <p className="text-[12px] text-slate-300 mt-0.5">
              {status === "success"
                ? message
                : "We\u2019ll text you a link so you can find it later."}
            </p>
          </div>
        </div>

        {status !== "success" && (
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                disabled={status === "loading"}
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-400 text-sm h-10 focus-visible:ring-[var(--theme-accent)]"
                aria-label="Phone number"
              />
              <Button
                type="submit"
                disabled={status === "loading" || !phone.trim()}
                className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white shrink-0 h-10 px-5 font-semibold text-sm"
              >
                {status === "loading" ? "..." : "Send"}
              </Button>
            </div>
            {status === "error" && message && (
              <p className="text-xs text-red-300 mt-2">{message}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-2">
              Standard messaging rates apply. One text, no follow-ups.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
