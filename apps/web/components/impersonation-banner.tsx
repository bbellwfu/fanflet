"use client";

import { useState, useEffect } from "react";
import { EyeIcon, XIcon, ExternalLinkIcon } from "lucide-react";

interface ImpersonationBannerProps {
  targetName: string;
  targetEmail: string;
  targetRole: "speaker" | "sponsor";
  writeEnabled: boolean;
  expiresAt: string;
  adminUrl: string;
}

export function ImpersonationBanner({
  targetName,
  targetEmail,
  targetRole,
  writeEnabled,
  expiresAt,
  adminUrl,
}: ImpersonationBannerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    function updateTimer() {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, "0")}s`);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  async function handleExit() {
    setExiting(true);
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/impersonate/stop";
      document.body.appendChild(form);
      form.submit();
    } catch {
      setExiting(false);
    }
  }

  const roleLabel = targetRole === "speaker" ? "Speaker" : "Sponsor";
  const modeLabel = writeEnabled ? "Read/Write" : "Read-only";
  const modeColor = writeEnabled
    ? "bg-red-500/20 text-red-100"
    : "bg-amber-900/30 text-amber-100";

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 shadow-lg print:hidden">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <EyeIcon className="w-4 h-4 shrink-0" />
          <span className="font-semibold shrink-0">IMPERSONATION MODE</span>
          <span className="hidden sm:inline text-amber-800">|</span>
          <span className="hidden sm:inline truncate">
            Viewing as{" "}
            <span className="font-semibold">{targetName}</span>{" "}
            <span className="text-amber-700">({targetEmail})</span>
          </span>
          <span
            className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${modeColor}`}
          >
            {modeLabel}
          </span>
          <span
            className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-900/20 text-amber-100"
          >
            {roleLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] font-mono text-amber-800 hidden sm:inline">
            {timeLeft}
          </span>

          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 text-[12px] font-medium text-amber-800 hover:text-amber-950 transition-colors"
          >
            Admin
            <ExternalLinkIcon className="w-3 h-3" />
          </a>

          <button
            onClick={handleExit}
            disabled={exiting}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950 text-amber-100 text-[12px] font-semibold hover:bg-amber-900 transition-colors disabled:opacity-50"
          >
            <XIcon className="w-3 h-3" />
            {exiting ? "Exiting..." : "Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
