import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDateTime } from "@fanflet/db/timezone";
import Link from "next/link";
import {
  MegaphoneIcon,
  PlusIcon,
  SendIcon,
  FileEditIcon,
  ClockIcon,
} from "lucide-react";
import { Button } from "@fanflet/ui/button";

interface CommunicationRow {
  id: string;
  created_at: string;
  title: string;
  status: string;
  sent_at: string | null;
  source_reference: string | null;
}

const statusConfig: Record<string, { label: string; classes: string; icon: typeof SendIcon }> = {
  draft: {
    label: "Draft",
    classes: "bg-surface-elevated text-fg-muted",
    icon: FileEditIcon,
  },
  scheduled: {
    label: "Scheduled",
    classes: "bg-primary-muted text-primary-soft",
    icon: ClockIcon,
  },
  sent: {
    label: "Sent",
    classes: "bg-success/10 text-success",
    icon: SendIcon,
  },
};

export default async function CommunicationsPage() {
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

  const { data: comms, error } = await supabase
    .from("platform_communications")
    .select("id, created_at, title, status, sent_at, source_reference")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load communications: {error.message}
      </div>
    );
  }

  const rows: (CommunicationRow & { delivery_count: number })[] = await Promise.all(
    (comms ?? []).map(async (c) => {
      const { count } = await supabase
        .from("communication_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("communication_id", c.id);
      return { ...c, delivery_count: count ?? 0 };
    })
  );

  const drafts = rows.filter((r) => r.status === "draft");
  const sent = rows.filter((r) => r.status === "sent");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            Communications
          </h1>
          <p className="text-sm text-fg-secondary mt-1">
            Send platform announcements to speakers
          </p>
        </div>
        <Button asChild>
          <Link href="/communications/new">
            <PlusIcon className="w-4 h-4 mr-1.5" />
            New Communication
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Total Sent
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {sent.length}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Drafts
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {drafts.length}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Emails Delivered
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {rows.reduce((sum, r) => sum + r.delivery_count, 0)}
          </p>
        </div>
      </div>

      {/* Communications Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">All Communications</h2>
        </div>

        {rows.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {rows.map((row) => {
              const cfg = statusConfig[row.status] ?? statusConfig.draft;
              const StatusIcon = cfg.icon;
              return (
                <Link
                  key={row.id}
                  href={
                    row.status === "draft"
                      ? `/communications/new?draft=${row.id}`
                      : `/communications/${row.id}`
                  }
                  className="block px-5 py-4 hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-fg truncate">
                          {row.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cfg.classes}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-fg-muted">
                        <span>
                          {formatDateTime(
                            row.sent_at ?? row.created_at,
                            adminTimezone
                          )}
                        </span>
                        {row.status === "sent" && (
                          <span>
                            {row.delivery_count} email
                            {row.delivery_count !== 1 ? "s" : ""} delivered
                          </span>
                        )}
                        {row.source_reference && (
                          <span className="truncate max-w-xs">
                            Source: {row.source_reference}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <MegaphoneIcon className="w-8 h-8 text-fg-muted mx-auto mb-2" />
            <p className="text-[13px] text-fg-muted">
              No communications yet. Create your first announcement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
