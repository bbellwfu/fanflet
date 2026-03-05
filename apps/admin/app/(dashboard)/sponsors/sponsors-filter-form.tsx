"use client";

import { useState, useEffect } from "react";
import { Input } from "@fanflet/ui/input";
import { Button } from "@fanflet/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";

interface SponsorsFilterFormProps {
  defaultSearch: string;
  defaultStatus: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "verified", label: "Verified" },
] as const;

export function SponsorsFilterForm({
  defaultSearch,
  defaultStatus,
}: SponsorsFilterFormProps) {
  const [status, setStatus] = useState(defaultStatus);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "All Statuses";

  return (
    <form className="flex flex-col sm:flex-row gap-3" method="get">
      <Input
        name="search"
        type="text"
        placeholder="Search by company, email, or slug..."
        defaultValue={defaultSearch}
        className="flex-1 h-9 bg-page border-border-subtle text-fg placeholder:text-fg-muted"
      />
      <input type="hidden" name="status" value={status} />
      {mounted ? (
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="default" className="h-9 w-full sm:w-[180px] bg-page border-border-subtle">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex h-9 w-full sm:w-[180px] items-center rounded-md border border-border-subtle bg-page px-3 text-sm text-fg">
          {selectedLabel}
        </div>
      )}
      <Button
        type="submit"
        size="default"
        className="h-9 bg-primary text-primary-fg hover:bg-primary/90"
      >
        Filter
      </Button>
    </form>
  );
}
