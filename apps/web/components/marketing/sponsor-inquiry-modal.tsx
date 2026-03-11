"use client";

import { useState, useCallback, useEffect } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface SponsorInquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SponsorInquiryModal({
  open,
  onOpenChange,
}: SponsorInquiryModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setDetails("");
    setCaptchaToken(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [onOpenChange, resetForm]
  );

  const handleTurnstileSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    (window as unknown as { __turnstileSuccessRef?: (t: string) => void }).__turnstileSuccessRef = handleTurnstileSuccess;
    (window as unknown as { __turnstileExpireRef?: () => void }).__turnstileExpireRef = handleTurnstileExpire;
    return () => {
      delete (window as unknown as { __turnstileSuccessRef?: (t: string) => void }).__turnstileSuccessRef;
      delete (window as unknown as { __turnstileExpireRef?: () => void }).__turnstileExpireRef;
    };
  }, [open, handleTurnstileSuccess, handleTurnstileExpire]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/sponsor-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          details: details.trim(),
          ...(captchaToken && { captchaToken }),
        }),
      });

      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setCaptchaToken(null);
        return;
      }

      setSuccess(true);
      setTimeout(() => handleOpenChange(false), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const needsCaptcha = Boolean(TURNSTILE_SITE_KEY);
  const canSubmit = !needsCaptcha || Boolean(captchaToken);

  return (
    <>
      {open && TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1B2A4A]">
              Interested in Fanflet for Sponsors?
            </DialogTitle>
            <DialogDescription>
              Get more value from your KOL relationships—deeper engagement, stronger visibility, and measurable impact. Tell us what you&apos;re looking for and we&apos;ll show you how Fanflet can help.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-medium text-emerald-900">
                Thanks! We&apos;ll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sponsor-inquiry-name">Name</Label>
                <Input
                  id="sponsor-inquiry-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  disabled={isSubmitting}
                  className="border-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-inquiry-email">Email</Label>
                <Input
                  id="sponsor-inquiry-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={320}
                  disabled={isSubmitting}
                  className="border-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-inquiry-details">
                  What are you looking for?
                </Label>
                <Textarea
                  id="sponsor-inquiry-details"
                  placeholder="KOL partnerships, events you support, goals for engagement and visibility..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                  maxLength={5000}
                  rows={4}
                  disabled={isSubmitting}
                  className="resize-none border-[#E2E8F0]"
                />
              </div>

              {needsCaptcha && (
                <div className="flex justify-center" data-turnstile-widget>
                  <div
                    className="cf-turnstile"
                    data-sitekey={TURNSTILE_SITE_KEY}
                    data-callback="turnstileSuccess"
                    data-expired-callback="turnstileExpire"
                    data-theme="light"
                    data-size="normal"
                  />
                </div>
              )}

              {needsCaptcha && (
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.turnstileSuccess = function(token) {
                        if (window.__turnstileSuccessRef) window.__turnstileSuccessRef(token);
                      };
                      window.turnstileExpire = function() {
                        if (window.__turnstileExpireRef) window.__turnstileExpireRef();
                      };
                    `,
                  }}
                />
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !canSubmit}
                  className="bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90"
                >
                  {isSubmitting ? "Sending..." : "Send message"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
