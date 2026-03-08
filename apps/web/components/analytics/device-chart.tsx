"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { DeviceBreakdown } from "@fanflet/core";

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#6d5fba",
  desktop: "#3BA5D9",
  tablet: "#10b981",
  unknown: "#94a3b8",
};

interface DeviceChartProps {
  data: DeviceBreakdown[];
}

export function DeviceChart({ data }: DeviceChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No device data available.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    value: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
          stroke="none"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={DEVICE_COLORS[entry.name.toLowerCase()] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f8fafc",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
