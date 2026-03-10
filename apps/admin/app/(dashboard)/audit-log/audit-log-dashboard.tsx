"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import type { AuditLogEntry } from "./actions";
import { exportAuditLogCsv } from "./actions";

const CATEGORIES = [
  { value: "__all__", label: "All Categories" },
  { value: "account", label: "Account" },
  { value: "plan", label: "Plan" },
  { value: "feature", label: "Feature" },
  { value: "sponsor", label: "Sponsor" },
  { value: "communication", label: "Communication" },
  { value: "admin_management", label: "Admin Management" },
  { value: "setting", label: "Setting" },
  { value: "impersonation", label: "Impersonation" },
  { value: "system", label: "System" },
  { value: "compliance", label: "Compliance" },
];

const ACTION_LABELS: Record<string, string> = {
  "account.reset": "Reset Account",
  "account.suspend": "Suspend Account",
  "account.reactivate": "Reactivate Account",
  "plan.change_speaker": "Change Speaker Plan",
  "plan.update": "Update Plan",
  "plan.update_features": "Update Plan Features",
  "plan.create": "Create Plan",
  "plan.refresh_entitlements": "Refresh Entitlements",
  "feature_flag.toggle_global": "Toggle Feature Flag",
  "sponsor.verify": "Verify Sponsor",
  "sponsor.unverify": "Unverify Sponsor",
  "communication.create": "Create Communication",
  "communication.update_draft": "Update Draft",
  "communication.send": "Send Communication",
  "communication.delete_draft": "Delete Draft",
  "setting.update_notifications": "Update Notifications",
  "setting.update_timezone": "Update Timezone",
  "impersonation.start": "Start Impersonation",
  "admin.invite": "Invite Admin",
  "admin.remove": "Remove Admin",
  "admin.promote": "Promote to Super Admin",
  "admin.demote": "Demote to Admin",
  "admin.resend_invite": "Resend Invitation",
  "admin.revoke_invite": "Revoke Invitation",
  "admin.accept_invite": "Accept Invitation",
  "compliance.request_created": "Create Deletion Request",
  "compliance.batch_created": "Batch Create Requests",
  "compliance.request_approved": "Approve Deletion Request",
  "compliance.pipeline_completed": "Pipeline Completed",
  "compliance.pipeline_failed": "Pipeline Failed",
  "compliance.request_cancelled": "Cancel Deletion Request",
};

const PAGE_SIZE = 50;

interface AuditLogDashboardProps {
  entries: AuditLogEntry[];
  totalCount: number;
  admins: { id: string; email: string }[];
  currentFilters: {
    category?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
  };
}

export function AuditLogDashboard({
  entries,
  totalCount,
  admins,
  currentFilters,
}: AuditLogDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const page = currentFilters.page ?? 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function updateFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/audit-log?${params.toString()}`);
    });
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) {
      params.set("page", String(p));
    } else {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`/audit-log?${params.toString()}`);
    });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportAuditLogCsv(currentFilters);
      if (result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-muted">Category</label>
          {mounted ? (
            <Select
              value={currentFilters.category ?? "__all__"}
              onValueChange={(v) => updateFilters({ category: v === "__all__" ? undefined : v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 w-48 rounded-md border border-input bg-transparent" />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-muted">Admin</label>
          {mounted ? (
            <Select
              value={currentFilters.adminId ?? "__all__"}
              onValueChange={(v) => updateFilters({ adminId: v === "__all__" ? undefined : v })}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Admins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Admins</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 w-56 rounded-md border border-input bg-transparent" />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-muted">From</label>
          <Input
            type="date"
            value={currentFilters.startDate ?? ""}
            onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
            className="w-40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-muted">To</label>
          <Input
            type="date"
            value={currentFilters.endDate ?? ""}
            onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
            className="w-40"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting || totalCount === 0}
          className="ml-auto"
        >
          <DownloadIcon className="w-4 h-4 mr-1.5" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-fg-muted">
        {totalCount === 0
          ? "No audit entries found"
          : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} entries`}
      </p>

      {/* Table */}
      <div className={`border border-border-subtle rounded-lg overflow-hidden ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-elevated">
              <th className="text-left px-4 py-3 font-medium text-fg-muted w-8" />
              <th className="text-left px-4 py-3 font-medium text-fg-muted">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-fg-muted">Admin</th>
              <th className="text-left px-4 py-3 font-medium text-fg-muted">Action</th>
              <th className="text-left px-4 py-3 font-medium text-fg-muted">Category</th>
              <th className="text-left px-4 py-3 font-medium text-fg-muted">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <Fragment key={entry.id}>
                  <tr
                    className="border-b border-border-subtle hover:bg-surface-elevated/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4 text-fg-muted" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-fg-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                      {formatTimestamp(entry.created_at)}
                    </td>
                    <td className="px-4 py-3 text-fg truncate max-w-[200px]">
                      {entry.admin_email ?? entry.admin_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-fg font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={entry.category} />
                    </td>
                    <td className="px-4 py-3 text-fg-secondary text-xs font-mono truncate max-w-[180px]">
                      {entry.target_type && entry.target_id
                        ? `${entry.target_type}:${entry.target_id.slice(0, 8)}`
                        : "—"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border-subtle">
                      <td colSpan={6} className="px-6 py-4 bg-surface-elevated/30">
                        <ExpandedDetails entry={entry} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-fg-muted">
                  No audit log entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { Fragment } from "react";

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    account: "bg-blue-100 text-blue-800",
    plan: "bg-purple-100 text-purple-800",
    feature: "bg-amber-100 text-amber-800",
    sponsor: "bg-green-100 text-green-800",
    communication: "bg-pink-100 text-pink-800",
    admin_management: "bg-red-100 text-red-800",
    setting: "bg-gray-100 text-gray-800",
    impersonation: "bg-orange-100 text-orange-800",
    system: "bg-slate-100 text-slate-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[category] ?? "bg-gray-100 text-gray-800"}`}
    >
      {category.replace("_", " ")}
    </span>
  );
}

function ExpandedDetails({ entry }: { entry: AuditLogEntry }) {
  const details = entry.details;
  const hasDetails = Object.keys(details).length > 0;

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
      <div>
        <span className="text-fg-muted">Admin ID:</span>{" "}
        <span className="font-mono text-xs text-fg-secondary">{entry.admin_id}</span>
      </div>
      {entry.ip_address && (
        <div>
          <span className="text-fg-muted">IP Address:</span>{" "}
          <span className="font-mono text-xs text-fg-secondary">{entry.ip_address}</span>
        </div>
      )}
      {entry.target_type && (
        <div>
          <span className="text-fg-muted">Target Type:</span>{" "}
          <span className="text-fg-secondary">{entry.target_type}</span>
        </div>
      )}
      {entry.target_id && (
        <div>
          <span className="text-fg-muted">Target ID:</span>{" "}
          <span className="font-mono text-xs text-fg-secondary">{entry.target_id}</span>
        </div>
      )}
      {entry.user_agent && (
        <div className="col-span-2">
          <span className="text-fg-muted">User Agent:</span>{" "}
          <span className="text-xs text-fg-secondary break-all">{entry.user_agent}</span>
        </div>
      )}
      {hasDetails && (
        <div className="col-span-2 mt-2">
          <span className="text-fg-muted block mb-1">Details:</span>
          <pre className="bg-surface-elevated rounded-md px-3 py-2 text-xs text-fg-secondary overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
