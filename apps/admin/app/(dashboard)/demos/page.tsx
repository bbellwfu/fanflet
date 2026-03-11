import { createServiceClient } from "@fanflet/db/service";
import { createClient } from "@fanflet/db/server";
import { formatDateTime } from "@fanflet/db/timezone";
import Link from "next/link";
import { PlusIcon, PlayCircleIcon } from "lucide-react";
import { Button } from "@fanflet/ui/button";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    provisioning: "bg-primary/10 text-primary",
    active: "bg-success/10 text-success",
    failed: "bg-error/10 text-error",
    converted: "bg-primary/10 text-primary",
    expired: "bg-warning/10 text-warning",
    deleted: "bg-surface-elevated text-fg-muted",
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

export default async function DemosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const { data: adminPrefs } = await supabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user!.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  let query = supabase
    .from("demo_environments")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: demos, error } = await query;

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load demos: {error.message}
      </div>
    );
  }

  const statusCounts = (demos ?? []).reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            Demo Environments
          </h1>
          <p className="text-sm text-fg-secondary mt-1">
            AI-generated personalized demos for prospects
          </p>
        </div>
        <Link href="/demos/new">
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="w-4 h-4" />
            Create Demo
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Active", value: statusCounts["active"] ?? 0 },
          { label: "Provisioning", value: statusCounts["provisioning"] ?? 0 },
          { label: "Converted", value: statusCounts["converted"] ?? 0 },
          { label: "Total", value: demos?.length ?? 0 },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-surface rounded-lg border border-border-subtle p-5"
          >
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
              {item.label}
            </p>
            <p className="text-2xl font-semibold text-fg tracking-tight">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-surface rounded-lg border border-border-subtle p-4">
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "provisioning", "converted", "failed", "expired", "deleted"].map(
            (s) => (
              <Link
                key={s}
                href={s === "all" ? "/demos" : `/demos?status=${s}`}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  (params.status ?? "all") === s
                    ? "bg-primary-muted text-fg"
                    : "text-fg-secondary hover:text-fg hover:bg-surface-elevated"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            ),
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
            <PlayCircleIcon className="w-4 h-4 text-primary-soft" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {demos?.length ?? 0} Demo
            {(demos?.length ?? 0) !== 1 ? "s" : ""}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[700px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Prospect
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Specialty
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Created
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {(demos ?? []).map((demo) => (
                <tr
                  key={demo.id}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/demos/${demo.id}`}
                        className="font-medium text-fg hover:text-primary transition-colors"
                      >
                        {demo.prospect_name}
                      </Link>
                      {demo.demo_type === "sponsor" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                          SPONSOR
                        </span>
                      )}
                    </div>
                    {demo.prospect_email && (
                      <p className="text-[12px] text-fg-muted mt-0.5">
                        {demo.prospect_email}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary">
                    {demo.prospect_specialty || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={demo.status} />
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary">
                    {formatDateTime(demo.created_at, adminTimezone)}
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary">
                    {formatDateTime(demo.expires_at, adminTimezone)}
                  </td>
                </tr>
              ))}
              {(demos?.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No demo environments yet.{" "}
                    <Link
                      href="/demos/new"
                      className="text-primary hover:underline"
                    >
                      Create your first one
                    </Link>
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
