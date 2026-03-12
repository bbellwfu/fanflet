"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileTextIcon, PenLineIcon, ArchiveIcon } from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { archiveWorklog } from "./actions";
import type { WorklogEntry } from "@/lib/worklog-types";
import { useState } from "react";
import { toast } from "sonner";

interface PendingWorklogCardProps {
  worklog: WorklogEntry;
}

export function PendingWorklogCard({ worklog }: PendingWorklogCardProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  async function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (archiving) return;
    setArchiving(true);
    const { error } = await archiveWorklog(worklog.filename);
    setArchiving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Worklog archived");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-primary/5 rounded-lg border border-primary/15 px-5 py-4 hover:bg-primary/10 transition-colors group">
      <Link
        href={`/communications/new?worklog=${encodeURIComponent(worklog.filename)}`}
        className="flex items-start gap-3 min-w-0 flex-1"
      >
        <FileTextIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">
            New worklog ready: {worklog.dateLabel}
          </p>
          <p className="text-[12px] text-fg-muted mt-0.5 truncate">
            {worklog.titleSummary}
            {worklog.features.length > 0 && (
              <span className="ml-2">
                &middot; {worklog.features.length} feature
                {worklog.features.length !== 1 ? "s" : ""}
              </span>
            )}
            {worklog.bugFixes.length > 0 && (
              <span className="ml-2">
                &middot; {worklog.bugFixes.length} fix
                {worklog.bugFixes.length !== 1 ? "es" : ""}
              </span>
            )}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="default" size="sm" asChild className="text-[12px]">
          <Link
            href={`/communications/new?worklog=${encodeURIComponent(worklog.filename)}`}
            className="inline-flex items-center gap-1.5"
          >
            <PenLineIcon className="w-3.5 h-3.5" />
            Draft announcement
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-[12px] text-fg-muted hover:text-fg border-border-subtle"
          onClick={handleArchive}
          disabled={archiving}
          aria-label={`Archive worklog ${worklog.filename}`}
        >
          <ArchiveIcon className="w-3.5 h-3.5 mr-1" />
          Archive
        </Button>
      </div>
    </div>
  );
}
