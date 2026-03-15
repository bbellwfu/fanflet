"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { useImpParam } from "@/lib/use-imp-param";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { DateRangeField } from "../ui/date-range-field";

export type RangeOption = {
  label: string;
  value: string;
};

const DEFAULT_RANGES: RangeOption[] = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "90d", value: "90" },
  { label: "1y", value: "365" },
  { label: "All", value: "all" },
];

interface DateRangeSelectorProps {
  ranges?: RangeOption[];
  defaultValue?: string;
  /** Max lookback in days. -1 or undefined = unlimited. Filters preset options and clamps custom min date. */
  maxDays?: number;
}

export function DateRangeSelector({
  ranges = DEFAULT_RANGES,
  defaultValue = "30",
  maxDays,
}: DateRangeSelectorProps) {
  const hasRetentionLimit = typeof maxDays === "number" && maxDays > 0;
  const filteredRanges = hasRetentionLimit
    ? ranges.filter((r) => {
        if (r.value === "all") return false;
        const days = parseInt(r.value, 10);
        return !isNaN(days) && days <= maxDays;
      })
    : ranges;
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const imp = useImpParam();

  const currentRange = searchParams.get("range") ?? defaultValue;
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") || "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") || "");

  const updateUrl = useCallback((params: URLSearchParams) => {
    if (imp) params.set("__imp", imp);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, imp]);

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "custom") {
        setShowCustom(!showCustom);
        return;
      }
      
      setShowCustom(false);
      params.delete("from");
      params.delete("to");
      
      if (value === defaultValue) {
        params.delete("range");
      } else {
        params.set("range", value);
      }
      updateUrl(params);
    },
    [searchParams, defaultValue, updateUrl, showCustom]
  );

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      toast.error("Please select both start and end dates");
      return;
    }

    const start = new Date(customFrom);
    const end = new Date(customTo);

    if (start > end) {
      toast.error("Start date cannot be after end date");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    updateUrl(params);
    setShowCustom(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const minDate = hasRetentionLimit
    ? new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined;

  return (
    <div className="relative inline-flex items-center gap-2" ref={dropdownRef}>
      <div className="inline-flex items-center rounded-lg border bg-white p-0.5 text-sm shadow-sm">
        {filteredRanges.map((r) => {
          const active = currentRange === r.value;
          return (
            <button
              key={r.value}
              onClick={() => handleChange(r.value)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all duration-200 ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          );
        })}
        
        <button
          onClick={() => handleChange("custom")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all duration-200 flex items-center gap-1.5 ${
            currentRange === "custom"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Custom
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showCustom && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-4">
            <DateRangeField
              from={customFrom}
              to={customTo}
              onFromChange={setCustomFrom}
              onToChange={setCustomTo}
              minDate={minDate}
              maxDate={today}
              stackInMobile={false}
              className="gap-3"
            />
            <button
              onClick={applyCustomRange}
              disabled={!customFrom || !customTo}
              className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
