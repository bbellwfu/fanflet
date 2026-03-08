"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ReferrerBreakdown } from "@fanflet/core";

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
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No traffic source data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 12, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f8fafc",
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
