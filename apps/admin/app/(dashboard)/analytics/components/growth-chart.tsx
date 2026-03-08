"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GrowthPoint } from "../actions";

interface GrowthChartProps {
  data: GrowthPoint[];
  color: string;
  label: string;
}

export function GrowthChart({ data, color, label }: GrowthChartProps) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="h-[200px] flex items-center justify-center text-fg-muted text-sm">
        No {label.toLowerCase()} data for this period.
      </div>
    );
  }

  // Compute cumulative line
  let cumulative = 0;
  const cumulativeData = data.map((d) => {
    cumulative += d.count;
    return { date: d.date, daily: d.count, cumulative };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--color-fg-muted, #64748b)" }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(Math.floor(data.length / 6) - 1, 0)}
          tickFormatter={(v) => {
            const d = new Date(String(v) + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-fg-muted, #64748b)" }}
          tickLine={false}
          axisLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface-elevated, #1e293b)",
            border: "1px solid var(--color-border-subtle, #334155)",
            borderRadius: "8px",
            color: "var(--color-fg, #f8fafc)",
            fontSize: "12px",
          }}
          labelFormatter={(label) => {
            const d = new Date(String(label) + "T00:00:00");
            return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          name={`Cumulative ${label}`}
          stroke={color}
          fill={`url(#grad-${label})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
