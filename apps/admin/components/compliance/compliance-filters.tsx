"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface ComplianceFiltersProps {
  currentStatus?: string;
  currentSubjectType?: string;
  currentSource?: string;
  currentSearch?: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "processing", label: "Processing" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

const SUBJECT_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "speaker", label: "Speaker" },
  { value: "sponsor", label: "Sponsor" },
  { value: "audience", label: "Audience" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "admin_initiated", label: "Admin" },
  { value: "user_self_service", label: "Self-service" },
  { value: "email_request", label: "Email" },
  { value: "legal_request", label: "Legal" },
];

export function ComplianceFilters({
  currentStatus,
  currentSubjectType,
  currentSource,
  currentSearch,
}: ComplianceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/compliance?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Search by email or name..."
        defaultValue={currentSearch ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          if (val.length === 0 || val.length >= 3) {
            updateParam("search", val);
          }
        }}
        className="h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
      />
      <select
        value={currentStatus ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={currentSubjectType ?? ""}
        onChange={(e) => updateParam("subject_type", e.target.value)}
        className="h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {SUBJECT_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={currentSource ?? ""}
        onChange={(e) => updateParam("source", e.target.value)}
        className="h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {SOURCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
