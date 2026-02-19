"use client";

import { useState } from "react";
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
}

export function AccountsFilterForm({
  defaultSearch,
  defaultStatus,
  defaultCreatedSince = "",
}: AccountsFilterFormProps) {
  const [status, setStatus] = useState(defaultStatus);

  return (
    <form className="flex flex-col sm:flex-row gap-3" method="get">
      <Input
        name="search"
        type="text"
        placeholder="Search by name or email..."
        defaultValue={defaultSearch}
        className="flex-1 h-9 bg-page border-border-subtle text-fg placeholder:text-fg-muted"
      />
      <input type="hidden" name="status" value={status} />
      {defaultCreatedSince ? (
        <input type="hidden" name="created_since" value={defaultCreatedSince} />
      ) : null}
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger size="default" className="h-9 w-full sm:w-[180px] bg-page border-border-subtle">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="deactivated">Deactivated</SelectItem>
        </SelectContent>
      </Select>
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
