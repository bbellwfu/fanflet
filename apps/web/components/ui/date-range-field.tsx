"use client";

import React from "react";
import { Input } from "./input";
import { Label } from "./label";

interface DateRangeFieldProps {
  from: string;
  to: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  maxDate?: string;
  fromLabel?: string;
  toLabel?: string;
  fromId?: string;
  toId?: string;
  className?: string;
  stackInMobile?: boolean;
  required?: boolean;
  children?: React.ReactNode;
}

/**
 * A reusable date range field that synchronizes the start and end dates.
 * Enforces that the end date cannot be before the start date.
 */
export function DateRangeField({
  from,
  to,
  onFromChange,
  onToChange,
  maxDate,
  fromLabel = "Start Date",
  toLabel = "End Date",
  fromId = "start-date",
  toId = "end-date",
  className = "",
  stackInMobile = true,
  required = false,
  children,
}: DateRangeFieldProps) {
  
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onFromChange(newVal);
    // If new start date is after current end date, reset end date
    if (to && newVal > to) {
      onToChange("");
    }
  };

  const containerClasses = stackInMobile 
    ? `grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`
    : `grid grid-cols-2 gap-4 ${className}`;

  return (
    <div className={containerClasses}>
      <div className="space-y-1.5">
        <Label htmlFor={fromId} className="block mb-1.5">{fromLabel}</Label>
        <Input
          id={fromId}
          type="date"
          value={from}
          max={maxDate}
          onChange={handleFromChange}
          required={required}
          className="w-full"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={toId} className="block mb-1.5">{toLabel}</Label>
        <Input
          id={toId}
          type="date"
          value={to}
          min={from}
          max={maxDate}
          onChange={(e) => onToChange(e.target.value)}
          disabled={!from}
          className="w-full disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        />
        {children}
      </div>
    </div>
  );
}
