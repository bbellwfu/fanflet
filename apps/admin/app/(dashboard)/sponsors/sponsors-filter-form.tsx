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

interface SponsorsFilterFormProps {
  defaultSearch: string;
  defaultStatus: string;
}

export function SponsorsFilterForm({
  defaultSearch,
  defaultStatus,
}: SponsorsFilterFormProps) {
  const [status, setStatus] = useState(defaultStatus);

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
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger size="default" className="h-9 w-full sm:w-[180px] bg-page border-border-subtle">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending Review</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
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
