import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@fanflet/ui/button";
import type { WorklogEntry } from "@/lib/worklog-types";
import { ArchivedWorklogsClient } from "./archived-worklogs-client";

let worklogIndex: WorklogEntry[] = [];
try {
  worklogIndex = (await import("@/generated/worklog-index.json")).default as WorklogEntry[];
} catch {
  // No worklog index
}

export default async function ArchivedWorklogsPage() {
  const supabase = createServiceClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  const { data: archives, error } = await supabase
    .from("worklog_archives")
    .select("worklog_filename, archived_at, archived_by_admin_id")
    .gte("archived_at", cutoff)
    .order("archived_at", { ascending: false });

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load archived worklogs: {error.message}
      </div>
    );
  }

  const adminIds = [...new Set((archives ?? []).map((a) => a.archived_by_admin_id))];
  const emailMap = new Map<string, string>();
  for (const id of adminIds) {
    const { data } = await supabase.auth.admin.getUserById(id);
    if (data?.user?.email) emailMap.set(id, data.user.email);
  }

  const indexByFilename = new Map(worklogIndex.map((w) => [w.filename, w]));

  const rows = (archives ?? []).map((a) => {
    const entry = indexByFilename.get(a.worklog_filename);
    return {
      worklog_filename: a.worklog_filename,
      archived_at: a.archived_at,
      archived_by_email: emailMap.get(a.archived_by_admin_id) ?? null,
      dateLabel: entry?.dateLabel,
      titleSummary: entry?.titleSummary,
    };
  });

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/communications">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Communications
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Archived worklogs
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Worklogs archived in the last 30 days. Unarchive to show them again in
          the communications flow. Older entries are hidden here but not deleted.
        </p>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">
            Recent archives (last 30 days)
          </h2>
        </div>
        <ArchivedWorklogsClient rows={rows} />
      </div>
    </div>
  );
}
