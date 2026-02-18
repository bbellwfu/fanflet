import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { UsersIcon } from "lucide-react";
import { AccountsFilterForm } from "./accounts-filter-form";

interface SpeakerWithCounts {
  id: string;
  name: string;
  email: string;
  slug: string | null;
  status: string;
  created_at: string;
  fanflet_count: number;
  subscriber_count: number;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("speakers")
    .select("id, name, email, slug, status, created_at")
    .order("created_at", { ascending: false });

  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%`
    );
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: speakers, error } = await query;

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load accounts: {error.message}
      </div>
    );
  }

  const speakersWithCounts: SpeakerWithCounts[] = await Promise.all(
    (speakers ?? []).map(async (speaker) => {
      const [fanfletResult, subscriberResult] = await Promise.all([
        supabase
          .from("fanflets")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", speaker.id),
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", speaker.id),
      ]);

      return {
        ...speaker,
        fanflet_count: fanfletResult.count ?? 0,
        subscriber_count: subscriberResult.count ?? 0,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Accounts
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Manage speaker accounts across the platform
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-surface rounded-lg border border-border-subtle p-5">
        <AccountsFilterForm
          key={`${params.search ?? ""}-${params.status ?? "all"}`}
          defaultSearch={params.search ?? ""}
          defaultStatus={params.status ?? "all"}
        />
      </div>

      {/* Accounts Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
            <UsersIcon className="w-4 h-4 text-primary-soft" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {speakersWithCounts.length} Speaker
            {speakersWithCounts.length !== 1 ? "s" : ""}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Slug
                </th>
                <th className="px-5 py-3 text-center text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Fanflets
                </th>
                <th className="px-5 py-3 text-center text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Subs
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {speakersWithCounts.map((speaker) => (
                <tr
                  key={speaker.id}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/accounts/${speaker.id}`}
                      className="font-medium text-fg hover:text-primary transition-colors"
                    >
                      {speaker.name || "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary">
                    {speaker.email}
                  </td>
                  <td className="px-5 py-3.5 text-fg-muted font-mono text-[11px]">
                    {speaker.slug ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center text-fg">
                    {speaker.fanflet_count}
                  </td>
                  <td className="px-5 py-3.5 text-center text-fg">
                    {speaker.subscriber_count}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={speaker.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted">
                    {new Date(speaker.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {speakersWithCounts.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No accounts found
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/10 text-success",
    suspended: "bg-warning/10 text-warning",
    deactivated: "bg-error/10 text-error",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
        styles[status] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {status}
    </span>
  );
}
