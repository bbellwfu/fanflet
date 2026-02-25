"use client";

import { useState } from "react";
import { toggleFeatureGlobal } from "./actions";
import { toast } from "sonner";

interface FeatureToggleProps {
  flagId: string;
  isGlobal: boolean;
}

export function FeatureToggle({ flagId, isGlobal }: FeatureToggleProps) {
  const [checked, setChecked] = useState(isGlobal);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const newValue = !checked;
    setChecked(newValue);

    const result = await toggleFeatureGlobal(flagId, newValue);
    setLoading(false);

    if (result.error) {
      setChecked(!newValue);
      toast.error(result.error);
    } else {
      toast.success(
        newValue ? "Feature enabled globally" : "Feature restricted to plans"
      );
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Feature is global (everyone); click to restrict to plans" : "Feature is plan-based; click to enable globally"}
      title={checked ? "Global: everyone has this feature. Click to restrict to specific plans." : "Plan-based: only assigned plans have this feature. Click to enable for everyone."}
      onClick={handleToggle}
      disabled={loading}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full shrink-0
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-page
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? "bg-primary" : "bg-surface-hover"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}
