"use client";

import type { EventDistribution } from "../actions";

interface EventDistributionBarProps {
  data: EventDistribution[];
}

export function EventDistributionBar({ data }: EventDistributionBarProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="h-[100px] flex items-center justify-center text-fg-muted text-sm">
        No events in this period.
      </div>
    );
  }

  const COLORS = [
    "bg-primary", "bg-info", "bg-success", "bg-warning",
    "bg-error", "bg-primary/60", "bg-info/60",
  ];

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-6 rounded-lg overflow-hidden">
        {data.map((item, idx) => {
          const pct = (item.count / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={item.eventType}
              className={`${COLORS[idx % COLORS.length]} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${item.eventType}: ${item.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((item, idx) => (
          <div key={item.eventType} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${COLORS[idx % COLORS.length]}`} />
            <span className="text-[11px] text-fg-secondary">
              {item.eventType}
            </span>
            <span className="text-[11px] font-medium text-fg">
              {item.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
