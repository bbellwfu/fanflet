"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportAuditLogCsv } from "./actions";

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  update_profile: "Updated profile",
  update_logo: "Updated logo",
  remove_logo: "Removed logo",
  invite_team_member: "Invited team member",
  remove_team_member: "Removed team member",
  update_team_member_role: "Changed member role",
  revoke_invitation: "Revoked invitation",
  create_campaign: "Created campaign",
  update_campaign: "Updated campaign",
  delete_campaign: "Deleted campaign",
  accept_connection: "Accepted connection",
  decline_connection: "Declined connection",
  end_connection: "Ended connection",
  create_library_resource: "Created resource",
  update_library_resource: "Updated resource",
  remove_library_resource: "Removed resource",
  export_leads: "Exported leads",
  add_integration: "Added integration",
  remove_integration: "Removed integration",
};

const CATEGORY_COLORS: Record<string, string> = {
  settings: "bg-blue-100 text-blue-800",
  team: "bg-purple-100 text-purple-800",
  campaigns: "bg-amber-100 text-amber-800",
  connections: "bg-green-100 text-green-800",
  library: "bg-indigo-100 text-indigo-800",
  leads: "bg-rose-100 text-rose-800",
  integrations: "bg-cyan-100 text-cyan-800",
  billing: "bg-orange-100 text-orange-800",
};

interface AuditLogTableProps {
  entries: AuditEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = categoryFilter === "all"
    ? entries
    : entries.filter((e) => e.category === categoryFilter);

  const categories = [...new Set(entries.map((e) => e.category))].sort();

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportAuditLogCsv();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Audit log exported");
      }
    });
  };

  const formatDetails = (entry: AuditEntry): string => {
    if (!entry.details || Object.keys(entry.details).length === 0) return "";
    const parts: string[] = [];
    if (entry.details.email) parts.push(String(entry.details.email));
    if (entry.details.role) parts.push(`role: ${entry.details.role}`);
    if (entry.details.name) parts.push(String(entry.details.name));
    if (parts.length === 0) return JSON.stringify(entry.details);
    return parts.join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              {filtered.length} event{filtered.length !== 1 ? "s" : ""} shown
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity recorded yet. Actions taken on this account will appear here.
          </p>
        ) : (
          <div className="divide-y">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${CATEGORY_COLORS[entry.category] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {entry.category}
                    </Badge>
                    <p className="text-sm font-medium text-zinc-900">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                  </div>
                  {formatDetails(entry) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {formatDetails(entry)}
                    </p>
                  )}
                  {entry.target_id && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {entry.target_type}: {entry.target_id.slice(0, 8)}...
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
