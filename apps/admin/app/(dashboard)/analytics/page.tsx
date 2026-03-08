import Link from "next/link";
import {
  EyeIcon,
  UsersIcon,
  MousePointerClickIcon,
  PercentIcon,
  QrCodeIcon,
  ArrowUpRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react";
import {
  getPlatformKPIs,
  getPlatformTimeSeries,
  getDeviceBreakdown,
  getReferrerBreakdown,
  getEventDistribution,
  getTopFanflets,
  getPeakActivityHeatmap,
} from "./actions";
import { PlatformChart } from "./components/platform-chart";
import { DeviceChart } from "./components/device-chart";
import { ReferrerChart } from "./components/referrer-chart";
import { EventDistributionBar } from "./components/event-distribution";
import { ActivityHeatmap } from "./components/heatmap";

export const metadata = { title: "Analytics — Platform Health" };

/* ── KPI card with change indicator ── */
interface KPICardProps {
  title: string;
  value: string;
  prev: number;
  current: number;
  icon: React.ReactNode;
  format?: "number" | "percent";
}

function KPICard({ title, value, prev, current, icon, format = "number" }: KPICardProps) {
  const change =
    prev > 0 ? ((current - prev) / prev) * 100 : current > 0 ? 100 : 0;
  const isUp = change > 0;
  const isFlat = change === 0;

  return (
    <div className="bg-surface rounded-lg border border-border-subtle p-5 min-w-0">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">
          {title}
        </p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-muted text-primary-soft">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-semibold text-fg tracking-tight">{value}</p>
      {!isFlat && (
        <div className={`flex items-center gap-1 mt-1.5 text-[12px] ${isUp ? "text-success" : "text-error"}`}>
          {isUp ? <TrendingUpIcon className="w-3.5 h-3.5" /> : <TrendingDownIcon className="w-3.5 h-3.5" />}
          <span className="font-medium">
            {format === "percent"
              ? `${Math.abs(change).toFixed(1)}pp`
              : `${Math.abs(change).toFixed(1)}%`}
          </span>
          <span className="text-fg-muted">vs. prior period</span>
        </div>
      )}
    </div>
  );
}

export default async function AnalyticsPage() {
  const [kpis, timeSeries, devices, referrers, events, topFanflets, heatmap] =
    await Promise.all([
      getPlatformKPIs(),
      getPlatformTimeSeries(),
      getDeviceBreakdown(),
      getReferrerBreakdown(),
      getEventDistribution(),
      getTopFanflets(),
      getPeakActivityHeatmap(),
    ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Platform Health
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Analytics overview — last 30 days
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <KPICard
          title="Page Views"
          value={kpis.totalPageViews.toLocaleString()}
          current={kpis.totalPageViews}
          prev={kpis.prevPageViews}
          icon={<EyeIcon className="w-4 h-4" />}
        />
        <KPICard
          title="Unique Visitors"
          value={kpis.uniqueVisitors.toLocaleString()}
          current={kpis.uniqueVisitors}
          prev={kpis.prevUniqueVisitors}
          icon={<UsersIcon className="w-4 h-4" />}
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          current={kpis.conversionRate}
          prev={kpis.prevSubscribers > 0 && kpis.prevUniqueVisitors > 0 ? (kpis.prevSubscribers / kpis.prevUniqueVisitors) * 100 : 0}
          icon={<PercentIcon className="w-4 h-4" />}
          format="percent"
        />
        <KPICard
          title="Subscribers"
          value={kpis.totalSubscribers.toLocaleString()}
          current={kpis.totalSubscribers}
          prev={kpis.prevSubscribers}
          icon={<UsersIcon className="w-4 h-4" />}
        />
        <KPICard
          title="Resource Clicks"
          value={kpis.totalResourceClicks.toLocaleString()}
          current={kpis.totalResourceClicks}
          prev={kpis.prevResourceClicks}
          icon={<MousePointerClickIcon className="w-4 h-4" />}
        />
        <KPICard
          title="QR Adoption"
          value={`${kpis.qrAdoptionRate.toFixed(1)}%`}
          current={kpis.qrAdoptionRate}
          prev={0}
          icon={<QrCodeIcon className="w-4 h-4" />}
          format="percent"
        />
      </div>

      {/* Trend Chart */}
      <div className="bg-surface rounded-lg border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-fg">Platform Activity</h2>
          <span className="text-[11px] text-fg-muted">Last 60 days</span>
        </div>
        <PlatformChart data={timeSeries} />
      </div>

      {/* Device + Referrer + Event Distribution */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Device Split</h2>
          <DeviceChart data={devices} />
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Traffic Sources</h2>
          <ReferrerChart data={referrers} />
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Event Breakdown</h2>
          <EventDistributionBar data={events} />
        </div>
      </div>

      {/* Top Fanflets Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Top Fanflets</h2>
          <Link
            href="/analytics/engagement"
            className="text-[12px] font-medium text-primary-soft hover:text-primary transition-colors flex items-center gap-1"
          >
            View all
            <ArrowUpRightIcon className="w-3 h-3" />
          </Link>
        </div>
        {topFanflets.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-fg-muted">
              No analytics data yet. Fanflets will appear here once they receive traffic.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted px-5 py-2.5">
                    Fanflet
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Speaker
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Views
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Unique
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Clicks
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Subs
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-5 py-2.5">
                    Conv.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {topFanflets.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-medium text-fg truncate max-w-[200px]">
                      {f.title}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary truncate max-w-[150px]">
                      {f.speakerName}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {f.views.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {f.uniqueVisitors.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {f.clicks.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {f.subscribers.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {f.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Peak Activity Heatmap */}
      <div className="bg-surface rounded-lg border border-border-subtle p-5">
        <h2 className="text-sm font-semibold text-fg mb-4">Peak Activity (UTC)</h2>
        <ActivityHeatmap data={heatmap} />
      </div>
    </div>
  );
}
