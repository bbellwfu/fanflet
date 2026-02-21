"use client";

import { useState } from "react";

interface LimitFieldProps {
  name: string;
  label: string;
  description: string;
  defaultValue?: number;
}

export function LimitField({
  name,
  label,
  description,
  defaultValue,
}: LimitFieldProps) {
  const isUnlimited = defaultValue === undefined || defaultValue === -1;
  const [mode, setMode] = useState<"unlimited" | "limited">(
    isUnlimited ? "unlimited" : "limited"
  );
  const [value, setValue] = useState<string>(
    isUnlimited ? "" : String(defaultValue)
  );

  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium text-fg">{label}</legend>
      <p className="text-[11px] text-fg-muted">{description}</p>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer text-[13px]">
          <input
            type="radio"
            checked={mode === "unlimited"}
            onChange={() => setMode("unlimited")}
            className="text-primary focus:ring-primary"
          />
          <span className="text-fg">Unlimited</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[13px]">
          <input
            type="radio"
            checked={mode === "limited"}
            onChange={() => setMode("limited")}
            className="text-primary focus:ring-primary"
          />
          <span className="text-fg">Set a limit</span>
        </label>
        {mode === "limited" && (
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 5"
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary mt-1"
          />
        )}
      </div>
      <input type="hidden" name={name} value={mode === "unlimited" ? "-1" : value} />
    </fieldset>
  );
}
