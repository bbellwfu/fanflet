"use client";

import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { ArchiveRestoreIcon } from "lucide-react";
import { toast } from "sonner";
import { unarchiveWorklog } from "../actions";

interface Row {
  worklog_filename: string;
  archived_at: string;
  archived_by_email: string | null;
  dateLabel?: string;
  titleSummary?: string;
}

interface ArchivedWorklogsClientProps {
  rows: Row[];
}

export function ArchivedWorklogsClient({ rows }: ArchivedWorklogsClientProps) {
  const router = useRouter();

  async function handleUnarchive(filename: string) {
    const { error } = await unarchiveWorklog(filename);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Worklog unarchived");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-fg-muted">
        No archived worklogs in the last 30 days. Entries older than 30 days are
        hidden from this view but are not deleted.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {rows.map((row) => (
        <div
          key={row.worklog_filename}
          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-elevated transition-colors"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-fg truncate">
              {row.dateLabel ?? row.titleSummary ?? row.worklog_filename}
            </p>
            <p className="text-[12px] text-fg-muted mt-0.5 truncate">
              {row.worklog_filename}
              {row.archived_by_email && (
                <span className="ml-2">
                  &middot; Archived by {row.archived_by_email}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] text-fg-muted">
              {new Date(row.archived_at).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleUnarchive(row.worklog_filename)}
              className="text-[12px]"
            >
              <ArchiveRestoreIcon className="w-3.5 h-3.5 mr-1" />
              Unarchive
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
