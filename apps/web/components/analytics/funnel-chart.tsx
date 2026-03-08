"use client";

import type { ConversionFunnelStep } from "@fanflet/core";

interface FunnelChartProps {
  data: ConversionFunnelStep[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const maxCount = Math.max(...data.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {data.map((step, i) => {
        const widthPercent = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 8) : 8;
        return (
          <div key={step.step}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700">{step.step}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {step.count.toLocaleString()}
                </span>
                {i > 0 && step.dropOffPercent > 0 && (
                  <span className="text-xs text-red-500 font-medium">
                    -{step.dropOffPercent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 bg-slate-100 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500 bg-gradient-to-r from-[#1B365D] to-[#3BA5D9]"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
