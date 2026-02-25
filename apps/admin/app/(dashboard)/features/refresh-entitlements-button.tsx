"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

interface RefreshEntitlementsButtonProps {
  planId: string;
  action: () => Promise<{ error?: string; count?: number }>;
}

export function RefreshEntitlementsButton({
  action,
}: RefreshEntitlementsButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await action(); })}
      className="inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-[12px] font-medium text-fg hover:bg-surface-elevated transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Refreshing..." : "Refresh entitlements"}
    </button>
  );
}
