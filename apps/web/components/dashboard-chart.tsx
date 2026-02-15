"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type ChartDataPoint = {
  date: string;
  subscribers: number;
  pageViews: number;
  resourceClicks: number;
};

interface DashboardChartProps {
  data?: ChartDataPoint[] | null;
}

export default function DashboardChart({ data }: DashboardChartProps) {
  const hasData = data && data.some(
    (d) => d.subscribers > 0 || d.pageViews > 0 || d.resourceClicks > 0
  );

  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No analytics data yet. Share your Fanflet to start seeing engagement.
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No activity in the last 60 days. Share your Fanflet to start tracking.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          interval={9}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          width={35}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: "8px",
            color: "#f8fafc",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="subscribers"
          name="Subscribers"
          stroke="#3BA5D9"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#3BA5D9" }}
        />
        <Line
          type="monotone"
          dataKey="pageViews"
          name="Page Views"
          stroke="#1B365D"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#1B365D" }}
        />
        <Line
          type="monotone"
          dataKey="resourceClicks"
          name="Resource Clicks"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#10b981" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
