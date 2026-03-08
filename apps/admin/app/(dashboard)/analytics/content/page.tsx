import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { getSpeakerLeaderboard, getResourceTypePerformance } from "../actions";

export const metadata = { title: "Analytics — Content" };

const TYPE_LABELS: Record<string, string> = {
  link: "Link",
  file: "File",
  text: "Text",
  sponsor: "Sponsor",
};

export default async function ContentPage() {
  const [speakers, resourceTypes] = await Promise.all([
    getSpeakerLeaderboard(),
    getResourceTypePerformance(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Content Performance
        </h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Speaker leaderboard and resource insights — last 30 days
        </p>
      </div>

      {/* Resource Type Performance */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Resource Type Comparison</h2>
          <p className="text-[12px] text-fg-muted mt-0.5">
            Which resource types get the most engagement
          </p>
        </div>
        {resourceTypes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-fg-muted">No resource data yet.</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {resourceTypes.map((rt) => (
                <div key={rt.type} className="bg-surface-elevated rounded-lg p-4">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-1">
                    {TYPE_LABELS[rt.type] ?? rt.type}
                  </p>
                  <p className="text-2xl font-semibold text-fg tabular-nums">
                    {rt.totalClicks.toLocaleString()}
                  </p>
                  <p className="text-[12px] text-fg-muted mt-0.5">total clicks</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
                    <div>
                      <p className="text-[18px] font-semibold text-fg tabular-nums">
                        {rt.avgClicksPerBlock.toFixed(1)}
                      </p>
                      <p className="text-[11px] text-fg-muted">avg per block</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-semibold text-fg tabular-nums">
                        {rt.blockCount}
                      </p>
                      <p className="text-[11px] text-fg-muted">blocks</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Speaker Leaderboard */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Speaker Leaderboard</h2>
          <p className="text-[12px] text-fg-muted mt-0.5">
            Ranked by total page views
          </p>
        </div>
        {speakers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-fg-muted">
              No speaker data yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-center text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5 w-12">
                    #
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Speaker
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Fanflets
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Views
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Subs
                  </th>
                  <th className="text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted px-3 py-2.5">
                    Conv.
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted px-5 py-2.5">
                    Top Fanflet
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {speakers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-3 py-3 text-center">
                      {idx < 3 ? (
                        <CrownIcon
                          className={`w-4 h-4 mx-auto ${
                            idx === 0
                              ? "text-warning"
                              : idx === 1
                                ? "text-fg-muted"
                                : "text-warning/50"
                          }`}
                        />
                      ) : (
                        <span className="text-[13px] text-fg-muted tabular-nums">
                          {idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 min-w-0">
                      <Link
                        href={`/accounts/${s.id}`}
                        className="text-[13px] font-medium text-fg hover:text-primary transition-colors truncate block max-w-[180px]"
                      >
                        {s.name}
                      </Link>
                      <p className="text-[11px] text-fg-muted truncate">
                        {s.email}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {s.fanfletCount}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {s.totalViews.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-fg-secondary text-right tabular-nums">
                      {s.totalSubscribers.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-medium text-fg text-right tabular-nums">
                      {s.conversionRate.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-[13px] text-fg-secondary truncate max-w-[180px]">
                      {s.topFanfletTitle ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
