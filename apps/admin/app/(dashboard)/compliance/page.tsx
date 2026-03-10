import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { PlusIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { ComplianceFilters } from "@/components/compliance/compliance-filters";

interface SearchParams {
  status?: string;
  subject_type?: string;
  source?: string;
  search?: string;
}

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("data_subject_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.subject_type) query = query.eq("subject_type", params.subject_type);
  if (params.source) query = query.eq("source", params.source);
  if (params.search) {
    query = query.or(
      `subject_email.ilike.%${params.search}%,subject_name.ilike.%${params.search}%`
    );
  }

  const { data: requests } = await query.limit(200);
  const allRequests = requests ?? [];

  const activeCount = allRequests.filter((r) =>
    ["pending", "approved", "processing"].includes(r.status)
  ).length;
  const completedThisMonth = allRequests.filter((r) => {
    if (r.status !== "completed" || !r.completed_at) return false;
    const d = new Date(r.completed_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalProcessed = allRequests.filter((r) =>
    ["completed", "cancelled"].includes(r.status)
  ).length;

  const stats = [
    { label: "Active Requests", value: activeCount },
    { label: "Completed This Month", value: completedThisMonth },
    { label: "Total Processed", value: totalProcessed },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-primary-soft" />
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              Compliance
            </h1>
            <p className="text-sm text-fg-secondary">
              Data subject requests and account deletion management
            </p>
          </div>
        </div>
        <Link href="/compliance/new">
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface rounded-lg border border-border-subtle p-5"
          >
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold text-fg tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <ComplianceFilters
        currentStatus={params.status}
        currentSubjectType={params.subject_type}
        currentSource={params.source}
        currentSearch={params.search}
      />

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-elevated/50">
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Type</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Request</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Source</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Status</th>
                <th className="text-left px-4 py-3 font-medium text-fg-muted">Created</th>
                <th className="text-right px-4 py-3 font-medium text-fg-muted">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {allRequests.length > 0 ? (
                allRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-fg truncate max-w-[200px]">
                          {req.subject_name ?? "Unknown"}
                        </p>
                        <p className="text-[12px] text-fg-muted truncate max-w-[200px]">
                          {req.subject_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SubjectTypeBadge type={req.subject_type} />
                    </td>
                    <td className="px-4 py-3 capitalize text-fg-secondary">
                      {req.request_type}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {formatSource(req.source)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-fg-muted whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/compliance/${req.id}`}
                        className="text-primary-soft hover:text-primary text-[12px] font-medium transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-fg-muted">
                    No data subject requests found
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

function SubjectTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    speaker: "bg-primary-muted text-primary-soft",
    sponsor: "bg-warning/10 text-warning",
    audience: "bg-surface-elevated text-fg-muted",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
        styles[type] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-primary-muted text-primary-soft",
    processing: "bg-primary-muted text-primary-soft",
    on_hold: "bg-error/10 text-error",
    completed: "bg-success/10 text-success",
    cancelled: "bg-surface-elevated text-fg-muted",
    rejected: "bg-error/10 text-error",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
        styles[status] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatSource(source: string): string {
  const labels: Record<string, string> = {
    user_self_service: "Self-service",
    admin_initiated: "Admin",
    email_request: "Email",
    legal_request: "Legal",
  };
  return labels[source] ?? source;
}
