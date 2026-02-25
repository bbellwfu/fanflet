"use client";

import { formatFileSize } from "@fanflet/db/storage";

interface StorageQuotaBarProps {
  usedBytes: number;
  limitMb: number;
}

export function StorageQuotaBar({ usedBytes, limitMb }: StorageQuotaBarProps) {
  const limitBytes = limitMb * 1024 * 1024;
  const percentage = limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isFull = percentage >= 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFull
                ? "bg-red-500"
                : isWarning
                  ? "bg-amber-500"
                  : "bg-[#3BA5D9]"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${
        isFull
          ? "text-red-600"
          : isWarning
            ? "text-amber-600"
            : "text-slate-500"
      }`}>
        {formatFileSize(usedBytes)} / {limitMb >= 1024 ? `${(limitMb / 1024).toFixed(0)} GB` : `${limitMb} MB`}
      </span>
    </div>
  );
}
