"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  BarChart3Icon, 
  CoinsIcon, 
  CheckCircle2Icon, 
  AlertCircleIcon,
  SearchIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  CpuIcon
} from "lucide-react";
import { Input, Button, Card } from "@fanflet/ui";

interface AiUsageDashboardProps {
  logs: any[];
  totalCount: number;
  stats: any;
  admins: { id: string; email: string }[];
  currentFilters: {
    featureName?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
    page: number;
  };
}

/* ── Accent colour variants for stat cards (copied from main dashboard style) ── */
type AccentColor = "violet" | "sky" | "emerald" | "amber" | "rose";

const accentBorder: Record<AccentColor, string> = {
  violet: "border-t-primary/60",
  sky: "border-t-info/60",
  emerald: "border-t-success/60",
  amber: "border-t-warning/60",
  rose: "border-t-error/60",
};

const accentIconBg: Record<AccentColor, string> = {
  violet: "bg-primary-muted text-primary-soft",
  sky: "bg-info/10 text-info",
  emerald: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  rose: "bg-error/10 text-error",
};

function StatCard({ title, value, subtitle, icon, accentColor = "violet" }: { title: string; value: any; subtitle?: string; icon: any; accentColor?: AccentColor }) {
  return (
    <div className={`bg-surface rounded-lg border border-border-subtle border-t-2 ${accentBorder[accentColor]} p-5 flex flex-col`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentIconBg[accentColor]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-semibold text-fg tracking-tight">{value}</p>
      {subtitle && <p className="text-[12px] text-fg-muted mt-1.5">{subtitle}</p>}
    </div>
  );
}

export function AiUsageDashboard({ logs, totalCount, stats, admins, currentFilters }: AiUsageDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    // Reset to page 1 on filter change unless explicitly setting page
    if (!updates.page) params.delete("page");
    
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const hasData = stats && stats.totalRequests > 0;
  const successRate = hasData ? ((stats.successCount / stats.totalRequests) * 100).toFixed(1) : "0.0";
  const errorRate = hasData ? ((stats.errorCount / stats.totalRequests) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Cost (USD)" 
          value={`$${stats?.totalCostUsd.toFixed(4) || "0.00"}`}
          subtitle={`${stats?.totalRequests || 0} total requests`}
          icon={<CoinsIcon className="w-4 h-4" />}
          accentColor="emerald"
        />
        <StatCard 
          title="Total Tokens" 
          value={stats?.totalTokens.toLocaleString() || "0"}
          subtitle="Prompt + Completion"
          icon={<BarChart3Icon className="w-4 h-4" />}
          accentColor="violet"
        />
        <StatCard 
          title="Success Rate" 
          value={`${successRate}%`}
          subtitle={`${stats?.successCount || 0} successful calls`}
          icon={<CheckCircle2Icon className="w-4 h-4" />}
          accentColor="sky"
        />
        <StatCard 
          title="Error Rate" 
          value={`${errorRate}%`}
          subtitle={`${stats?.errorCount || 0} failed calls`}
          icon={<AlertCircleIcon className="w-4 h-4" />}
          accentColor="rose"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end bg-surface border border-border-subtle rounded-lg p-5">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[12px] font-medium text-fg-secondary px-1">Feature</label>
          <select 
            className="w-full h-9 bg-surface-elevated border border-border rounded-md px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            value={currentFilters.featureName || ""}
            onChange={(e) => updateFilters({ feature: e.target.value })}
          >
            <option value="">All Features</option>
            <option value="communication_rewrite">Communication Rewrite</option>
            <option value="demo_generation_speaker">Demo Speaker Gen</option>
            <option value="demo_generation_sponsor">Demo Sponsor Gen</option>
          </select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[12px] font-medium text-fg-secondary px-1">Admin</label>
          <select 
            className="w-full h-9 bg-surface-elevated border border-border rounded-md px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            value={currentFilters.adminId || ""}
            onChange={(e) => updateFilters({ adminId: e.target.value })}
          >
            <option value="">All Admins</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.email}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-fg-secondary px-1">Start Date</label>
          <Input 
            type="date" 
            className="h-9 w-40"
            value={currentFilters.startDate || ""}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
          />
        </div>

        <Button 
          variant="outline" 
          className="h-9 gap-2"
          onClick={() => router.push("/ai-usage")}
        >
          Clear
        </Button>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden border-border-subtle bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-elevated border-b border-border-subtle">
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider">Timestamp</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider">Admin</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider">Feature</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider">Model</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider text-right">Tokens</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider text-right">Cost (Est.)</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-fg-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {logs.length > 0 ? logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-elevated transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap text-fg-muted font-mono text-[12px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="font-medium">{log.admin_email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary-soft uppercase tracking-tighter">
                      {log.feature_name.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-fg-muted italic text-[13px]">
                    {log.model}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-fg">
                    {log.total_tokens?.toLocaleString() || "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-fg font-medium">
                    ${log.estimated_cost_usd?.toFixed(5) || "—"}
                  </td>
                  <td className="px-5 py-4">
                    {log.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-success text-[13px] font-medium">
                        <CheckCircle2Icon className="w-3.5 h-3.5" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-error text-[13px] font-medium" title={log.error_message}>
                        <AlertCircleIcon className="w-3.5 h-3.5" />
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-fg-muted italic">
                    No logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {totalCount > 50 && (
          <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-between font-medium text-[13px] text-fg-secondary">
            <span>Showing {logs.length} of {totalCount} logs</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentFilters.page <= 1}
                onClick={() => updateFilters({ page: currentFilters.page - 1 })}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={logs.length < 50}
                onClick={() => updateFilters({ page: currentFilters.page + 1 })}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
