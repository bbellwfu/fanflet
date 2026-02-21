import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { MailIcon } from "lucide-react";

type MarketingSubscriber = {
  id: string;
  email: string;
  source: string;
  interest_tier: string | null;
  created_at: string;
};

export default async function WaitingListPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("marketing_subscribers")
    .select("id, email, source, interest_tier, created_at")
    .order("created_at", { ascending: false });

  if (params.tier && params.tier !== "all") {
    if (params.tier === "none") {
      query = query.is("interest_tier", null);
    } else {
      query = query.eq("interest_tier", params.tier);
    }
  }

  const { data: subscribers, error } = await query;

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load waiting list: {error.message}
      </div>
    );
  }

  const rows = (subscribers ?? []) as MarketingSubscriber[];
  const proCount = rows.filter((r) => r.interest_tier === "pro").length;
  const enterpriseCount = rows.filter((r) => r.interest_tier === "enterprise").length;
  const noTierCount = rows.filter((r) => !r.interest_tier || r.interest_tier === "").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Waiting List
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          People who signed up for updates from the pricing page and other public forms. Use filters to see who expressed interest in Pro vs Enterprise.
        </p>
      </div>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/waiting-list"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            (params.tier ?? "all") === "all"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          All
        </Link>
        <Link
          href="/waiting-list?tier=pro"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.tier === "pro"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          Pro
        </Link>
        <Link
          href="/waiting-list?tier=enterprise"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.tier === "enterprise"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          Enterprise / Custom
        </Link>
        <Link
          href="/waiting-list?tier=none"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.tier === "none"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          No tier selected
        </Link>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
            <MailIcon className="w-4 h-4 text-primary-soft" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {rows.length} signup{rows.length !== 1 ? "s" : ""}
            {(params.tier ?? "all") === "all" && (
              <span className="text-fg-muted font-normal ml-1.5">
                (Pro: {proCount}, Enterprise: {enterpriseCount}, none: {noTierCount})
              </span>
            )}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Source
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Interest
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Signed up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  <td className="px-5 py-3.5 text-fg">
                    {row.email}
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary text-[12px]">
                    {row.source}
                  </td>
                  <td className="px-5 py-3.5">
                    {row.interest_tier ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          row.interest_tier === "enterprise"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-primary-muted text-primary-soft"
                        }`}
                      >
                        {row.interest_tier === "enterprise" ? "Enterprise / Custom" : "Pro"}
                      </span>
                    ) : (
                      <span className="text-fg-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No signups yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
