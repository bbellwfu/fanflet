"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

/**
 * Loads GTM by injecting the script tag and noscript iframe.
 * Safe to call multiple times — checks for existing script first.
 */
function loadGTM(gtmId: string) {
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`)) {
    return;
  }

  // dataLayer init + gtm.start event
  const w = window as unknown as Record<string, unknown[]>;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);
}

interface CookieConsentProps {
  gtmId: string | undefined;
}

export function CookieConsent({ gtmId }: CookieConsentProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof document === "undefined") return false;

    const consent = getCookie("cookie_consent");
    const consentRequired = getCookie("cookie_consent_required");

    if (consent === "accepted" || consent === "declined") {
      return false;
    }

    if (consentRequired === "0") {
      return false;
    }

    return true;
  });

  useEffect(() => {
    const consent = getCookie("cookie_consent");
    const consentRequired = getCookie("cookie_consent_required");

    if (consent === "accepted") {
      if (gtmId) loadGTM(gtmId);
      return;
    }

    if (consent === "declined") {
      return;
    }

    if (consentRequired === "0") {
      setCookie("cookie_consent", "accepted", 365);
      if (gtmId) loadGTM(gtmId);
    }
  }, [gtmId]);

  const handleAccept = useCallback(() => {
    setCookie("cookie_consent", "accepted", 365);
    setVisible(false);
    if (gtmId) loadGTM(gtmId);
  }, [gtmId]);

  const handleDecline = useCallback(() => {
    setCookie("cookie_consent", "declined", 365);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          We use cookies to analyze site traffic and improve your experience.
          See our{" "}
          <Link href="/privacy" className="underline hover:text-slate-900">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDecline}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
