"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@fanflet/ui/input";
import { Button } from "@fanflet/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";

interface AccountsFilterFormProps {
  defaultSearch: string;
  defaultStatus: string;
  /** Preserve drill-down filter (e.g. "30" for New Signups 30d). */
  defaultCreatedSince?: string;
  /** When true, exclude demo accounts (default view = production only). */
  defaultHideDemo?: boolean;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
  { value: "pending_delete", label: "Pending Delete" },
] as const;

export function AccountsFilterForm({
  defaultSearch,
  defaultStatus,
  defaultCreatedSince = "",
  defaultHideDemo = true,
}: AccountsFilterFormProps) {
  const [status, setStatus] = useState(defaultStatus);
  const [hideDemo, setHideDemo] = useState(defaultHideDemo);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);

  const selectedLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "All Statuses";

  const applyDemoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHideDemo = e.target.checked;
    setHideDemo(newHideDemo);
    const form = (e.target as HTMLInputElement).form;
    if (!form) return;
    const search = (form.elements.namedItem("search") as HTMLInputElement | null)?.value?.trim() ?? "";
    const createdSince = (form.elements.namedItem("created_since") as HTMLInputElement | null)?.value?.trim() ?? defaultCreatedSince ?? "";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    if (createdSince) params.set("created_since", createdSince);
    params.set("demo", newHideDemo ? "exclude" : "all");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form className="flex flex-col gap-3" method="get">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          name="search"
          type="text"
          placeholder="Search by name or email..."
          defaultValue={defaultSearch}
          className="flex-1 h-9 bg-page border-border-subtle text-fg placeholder:text-fg-muted"
        />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="demo" value={hideDemo ? "exclude" : "all"} />
        {defaultCreatedSince ? (
          <input type="hidden" name="created_since" value={defaultCreatedSince} />
        ) : null}
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
      </div>
      <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={hideDemo}
          onChange={applyDemoChange}
          className="rounded border-border-subtle text-primary focus:ring-primary"
        />
        <span>Hide demo accounts</span>
      </label>
    </form>
  );
}
