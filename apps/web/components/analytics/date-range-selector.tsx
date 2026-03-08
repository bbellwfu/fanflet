"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const RANGES = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "90d", value: "90" },
  { label: "All Time", value: "all" },
] as const;

export function DateRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") ?? "30";

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "30") {
        params.delete("range");
      } else {
        params.set("range", value);
      }
      const qs = params.toString();
      router.push(`/dashboard/analytics${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams]
  );

  return (
    <div className="inline-flex items-center rounded-lg border bg-white p-0.5 text-sm">
      {RANGES.map((r) => {
        const active = current === r.value;
        return (
          <button
            key={r.value}
            onClick={() => handleChange(r.value)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
