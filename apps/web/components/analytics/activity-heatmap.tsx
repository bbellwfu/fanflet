"use client";

import type { HeatmapCell } from "@fanflet/core";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ActivityHeatmapProps {
  data: HeatmapCell[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = Math.max(...data.map((c) => c.count), 1);

  function intensity(count: number): string {
    if (count === 0) return "bg-slate-100";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-blue-200";
    if (ratio < 0.5) return "bg-blue-300";
    if (ratio < 0.75) return "bg-blue-500";
    return "bg-blue-700";
  }

  const grid = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const cell = data.find((c) => c.dayOfWeek === day && c.hour === hour);
      return cell?.count ?? 0;
    })
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex items-center mb-1 pl-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">
              {h % 3 === 0 ? `${h}` : ""}
            </div>
          ))}
        </div>
        {grid.map((hours, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-9 text-right text-[11px] text-slate-500 pr-1.5 shrink-0">
              {DAY_LABELS[dayIdx]}
            </div>
            {hours.map((count, hourIdx) => (
              <div
                key={hourIdx}
                className={`flex-1 aspect-square rounded-sm ${intensity(count)} transition-colors`}
                title={`${DAY_LABELS[dayIdx]} ${hourIdx}:00 — ${count} events`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center justify-end gap-1.5 mt-2 pr-1">
          <span className="text-[10px] text-muted-foreground">Less</span>
          <div className="w-3 h-3 rounded-sm bg-slate-100" />
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <div className="w-3 h-3 rounded-sm bg-blue-300" />
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <div className="w-3 h-3 rounded-sm bg-blue-700" />
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
