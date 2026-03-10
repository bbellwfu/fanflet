"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2Icon,
  CircleIcon,
  XCircleIcon,
  SkipForwardIcon,
  LoaderIcon,
} from "lucide-react";
import { getDeletionRequest } from "@/app/(dashboard)/compliance/actions";

interface Step {
  id: string;
  step_order: number;
  step_name: string;
  step_category: string;
  status: string;
  error_message: string | null;
  completed_at: string | null;
  details: Record<string, unknown>;
}

interface PipelineProgressProps {
  requestId: string;
  requestStatus: string;
  initialSteps: Step[];
}

const STEP_LABELS: Record<string, string> = {
  snapshot_data: "Snapshot account data",
  soft_delete_speaker: "Soft-delete speaker",
  delete_sponsor_connections: "Delete sponsor connections",
  delete_fanflets: "Delete fanflets",
  delete_subscribers: "Delete subscribers",
  delete_survey_questions: "Delete survey questions",
  delete_resource_library: "Delete resource library",
  delete_subscriptions: "Delete subscriptions & preferences",
  purge_storage: "Purge storage files",
  delete_identity: "Delete speaker identity",
  delete_auth_user: "Delete auth user",
  verify_deletion: "Verify complete deletion",
};

const CATEGORY_LABELS: Record<string, string> = {
  validation: "Validation",
  notification: "Notification",
  snapshot: "Data Export",
  soft_delete: "Soft Delete",
  data_deletion: "Data Deletion",
  storage_cleanup: "Storage",
  auth_deletion: "Auth",
  verification: "Verification",
};

const POLL_INTERVAL_MS = 2000;

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="w-5 h-5 text-success" />;
    case "in_progress":
      return <LoaderIcon className="w-5 h-5 text-primary-soft animate-spin" />;
    case "failed":
      return <XCircleIcon className="w-5 h-5 text-error" />;
    case "skipped":
      return <SkipForwardIcon className="w-5 h-5 text-fg-muted" />;
    default:
      return <CircleIcon className="w-5 h-5 text-fg-muted/40" />;
  }
}

const HIDDEN_DETAIL_KEYS = new Set(["cascaded", "status", "storage_error"]);

function formatDetails(details: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (HIDDEN_DETAIL_KEYS.has(key)) continue;
    if (typeof value === "number") {
      parts.push(`${key.replace(/_/g, " ")}: ${value}`);
    } else if (typeof value === "boolean") {
      parts.push(`${key.replace(/_/g, " ")}: ${value ? "yes" : "no"}`);
    }
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

export function PipelineProgress({
  requestId,
  requestStatus,
  initialSteps,
}: PipelineProgressProps) {
  const [polledSteps, setPolledSteps] = useState<Step[] | null>(null);
  const [polledStatus, setPolledStatus] = useState<string | null>(null);

  const status = polledStatus ?? requestStatus;
  const steps = polledSteps ?? initialSteps;
  const isActive = status === "processing";

  const poll = useCallback(async () => {
    const result = await getDeletionRequest(requestId);
    if (result.data) {
      setPolledSteps(result.data.steps as Step[]);
      setPolledStatus(result.data.request.status as string);
    }
  }, [requestId]);

  useEffect(() => {
    if (!isActive) return;

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive, poll]);

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;

  if (steps.length === 0) {
    return (
      <div>
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Deletion Pipeline</h2>
        </div>
        <div className="px-5 py-4">
          <div className="text-[13px] text-fg-muted py-4 text-center">
            Pipeline steps will appear after the request is approved.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
          Deletion Pipeline
          {isActive && (
            <LoaderIcon className="w-3.5 h-3.5 text-primary-soft animate-spin" />
          )}
        </h2>
        <span className="text-[12px] text-fg-muted">
          {completedSteps}/{totalSteps} steps completed
        </span>
      </div>
      <div className="px-5 py-4 space-y-1">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const label = STEP_LABELS[step.step_name] ?? step.step_name;
          const category =
            CATEGORY_LABELS[step.step_category] ?? step.step_category;
          const detailText =
            step.status === "completed" ? formatDetails(step.details) : null;

          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepIcon status={step.status} />
                {!isLast && (
                  <div
                    className={`w-px flex-1 my-1 ${
                      step.status === "completed"
                        ? "bg-success/40"
                        : "bg-border-subtle"
                    }`}
                  />
                )}
              </div>

              <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-fg">{label}</p>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-fg-muted bg-surface-elevated px-1.5 py-0.5 rounded">
                    {category}
                  </span>
                </div>

                {step.error_message && (
                  <p className="text-[12px] text-error mt-1">
                    {step.error_message}
                  </p>
                )}

                {detailText && (
                  <p className="text-[12px] text-fg-muted mt-0.5">
                    {detailText}
                  </p>
                )}

                {step.completed_at && (
                  <p className="text-[11px] text-fg-muted/60 mt-0.5">
                    {new Date(step.completed_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
