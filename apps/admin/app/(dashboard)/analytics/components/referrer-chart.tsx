"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ReferrerBreakdown } from "../actions";

const CATEGORY_COLORS: Record<string, string> = {
  Direct: "#6d5fba",
  Search: "#3BA5D9",
  Social: "#f59e0b",
  Email: "#10b981",
  "QR Code": "#ec4899",
  Portfolio: "#8b5cf6",
  "Share Link": "#06b6d4",
  Other: "#94a3b8",
};

interface ReferrerChartProps {
  data: ReferrerBreakdown[];
}

export function ReferrerChart({ data }: ReferrerChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-fg-muted text-sm">
        No referrer data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--color-fg-muted, #64748b)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 12, fill: "var(--color-fg-secondary, #475569)" }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface-elevated, #1e293b)",
            border: "1px solid var(--color-border-subtle, #334155)",
            borderRadius: "8px",
            color: "var(--color-fg, #f8fafc)",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
