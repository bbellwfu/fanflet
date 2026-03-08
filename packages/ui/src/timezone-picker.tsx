"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

interface TimezoneOption {
  label: string;
  value: string;
  group: string;
}

interface TimezonePickerProps {
  value: string;
  onValueChange: (value: string) => void;
  options: TimezoneOption[];
  className?: string;
  disabled?: boolean;
}

function getCurrentTime(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}

function TimezonePicker({
  value,
  onValueChange,
  options,
  className,
  disabled = false,
}: TimezonePickerProps) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, TimezoneOption[]>();
    for (const opt of options) {
      const group = map.get(opt.group) ?? [];
      group.push(opt);
      map.set(opt.group, group);
    }
    return map;
  }, [options]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className ?? "w-full"}>
        <SelectValue placeholder="Select timezone..." />
      </SelectTrigger>
      <SelectContent>
        {Array.from(grouped.entries()).map(([group, items]) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {getCurrentTime(item.value)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export { TimezonePicker };
export type { TimezonePickerProps, TimezoneOption };
