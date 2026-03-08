import Link from "next/link";
import {
  getEngagementTable,
  getResourceClickBreakdown,
  getReferrerBreakdown,
} from "../actions";

export const metadata = { title: "Analytics — Engagement" };

export default async function EngagementPage() {
  const [engagementRows, resourceClicks, referrers] = await Promise.all([
    getEngagementTable(),
    getResourceClickBreakdown(),
    getReferrerBreakdown(),
  ]);

  const totalViews = engagementRows.reduce((s, r) => s + r.views, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Engagement
        </h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Per-fanflet breakdown — last 30 days
        </p>
      </div>

      {/* Per-Fanflet Engagement Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Fanflet Performance</h2>
          <p className="text-[12px] text-fg-muted mt-0.5">
            {engagementRows.length} fanflets with activity
          </p>
        </div>
        {engagementRows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-fg-muted">
              No engagement data yet.
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
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Conv.
                  </th>
                  <th className="text-center text-[11px] font-medium uppercase tracking-wider text-fg-muted px-5 py-2.5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {engagementRows.map((row) => (
                  <tr key={row.fanfletId} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-5 py-3 min-w-0">
                      <p className="text-[13px] font-medium text-fg truncate max-w-[200px]">
                        {row.fanfletTitle}
                      </p>
                      {row.eventName && (
                        <p className="text-[11px] text-fg-muted truncate">{row.eventName}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary truncate max-w-[140px]">
                      {row.speakerName}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {row.views.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {row.uniqueVisitors.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {row.subscribers.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {row.conversionRate.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                          row.status === "published"
                            ? "bg-success/10 text-success"
                            : "bg-surface-elevated text-fg-muted"
                        }`}
                      >
                        {row.status === "published" ? "Live" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resource Click Breakdown */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Resource Clicks</h2>
          <p className="text-[12px] text-fg-muted mt-0.5">
            Individual resources ranked by clicks
          </p>
        </div>
        {resourceClicks.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-fg-muted">No resource clicks yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted px-5 py-2.5">
                    Resource
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Fanflet
                  </th>
                  <th className="text-center text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Type
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-5 py-2.5">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {resourceClicks.slice(0, 20).map((rc) => (
                  <tr key={rc.resourceBlockId} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-medium text-fg truncate max-w-[200px]">
                      {rc.resourceTitle}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary truncate max-w-[180px]">
                      {rc.fanfletTitle}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-fg-muted bg-surface-elevated px-2 py-0.5 rounded">
                        {rc.resourceType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {rc.clicks.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referrer Deep-Dive */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Traffic Sources</h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {referrers.map((r) => {
            const pct = totalViews > 0 ? (r.count / totalViews) * 100 : 0;
            return (
              <div key={r.category} className="px-5 py-3 flex items-center gap-4">
                <span className="text-[13px] font-medium text-fg w-24 shrink-0">
                  {r.category}
                </span>
                <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <span className="text-[13px] text-fg-secondary tabular-nums w-16 text-right">
                  {r.count.toLocaleString()}
                </span>
                <span className="text-[11px] text-fg-muted tabular-nums w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
