"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TimeSeriesPoint } from "../actions";

interface PlatformChartProps {
  data: TimeSeriesPoint[];
}

export function PlatformChart({ data }: PlatformChartProps) {
  if (data.length === 0 || data.every((d) => d.pageViews === 0 && d.subscribers === 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-fg-muted text-sm">
        No activity data for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary, #6d5fba)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-primary, #6d5fba)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-success, #10b981)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-success, #10b981)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-info, #3BA5D9)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-info, #3BA5D9)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--color-fg-muted, #64748b)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border-subtle, #e2e8f0)" }}
          interval={Math.max(Math.floor(data.length / 8) - 1, 0)}
          tickFormatter={(v) => {
            const d = new Date(String(v) + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-fg-muted, #64748b)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border-subtle, #e2e8f0)" }}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface-elevated, #1e293b)",
            border: "1px solid var(--color-border-subtle, #334155)",
            borderRadius: "8px",
            color: "var(--color-fg, #f8fafc)",
            fontSize: "12px",
          }}
          labelStyle={{ color: "var(--color-fg-muted, #94a3b8)", marginBottom: "4px" }}
          labelFormatter={(label) => {
            const d = new Date(String(label) + "T00:00:00");
            return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} iconType="circle" iconSize={8} />
        <Area
          type="monotone"
          dataKey="pageViews"
          name="Page Views"
          stroke="var(--color-primary, #6d5fba)"
          fill="url(#gradViews)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="resourceClicks"
          name="Resource Clicks"
          stroke="var(--color-success, #10b981)"
          fill="url(#gradClicks)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="subscribers"
          name="Subscribers"
          stroke="var(--color-info, #3BA5D9)"
          fill="url(#gradSubs)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
