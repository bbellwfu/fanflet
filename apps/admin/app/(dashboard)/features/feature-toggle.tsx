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
      setChecked(!newValue); // Revert on error
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
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
