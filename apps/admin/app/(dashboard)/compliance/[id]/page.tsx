import { notFound } from "next/navigation";
import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ArrowLeft, ShieldCheckIcon } from "lucide-react";
import { PipelineProgress } from "@/components/compliance/pipeline-progress";
import { RequestActions } from "@/components/compliance/request-actions";
import { ExportReportButton } from "@/components/compliance/export-report-button";
import { NotificationTracker } from "@/components/compliance/notification-tracker";

export default async function ComplianceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [requestResult, stepsResult] = await Promise.all([
    supabase
      .from("data_subject_requests")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("data_subject_request_steps")
      .select("*")
      .eq("request_id", id)
      .order("step_order", { ascending: true }),
  ]);

  if (requestResult.error || !requestResult.data) {
    notFound();
  }

  const request = requestResult.data;
  const steps = (stepsResult.data ?? []) as {
    id: string;
    step_order: number;
    step_name: string;
    step_category: string;
    status: string;
    error_message: string | null;
    completed_at: string | null;
    details: Record<string, unknown>;
  }[];

  const failedStep = steps.find((s) => s.status === "failed");
  const completedSteps = steps.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/compliance"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Compliance
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-primary-soft" />
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {request.subject_name ?? request.subject_email}
            </h1>
            <p className="text-sm text-fg-secondary">
              {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} request
            </p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Request details */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Request Details</h2>
        </div>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-fg-muted mb-0.5">Subject Email</dt>
              <dd className="font-medium text-fg">{request.subject_email}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Subject Type</dt>
              <dd className="font-medium text-fg capitalize">{request.subject_type}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Source</dt>
              <dd className="font-medium text-fg">{formatSource(request.source)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Regulation</dt>
              <dd className="font-medium text-fg uppercase">
                {request.regulation ?? "None specified"}
              </dd>
            </div>
            {request.regulatory_deadline && (
              <div>
                <dt className="text-fg-muted mb-0.5">Regulatory Deadline</dt>
                <dd className="font-medium text-fg">
                  {new Date(request.regulatory_deadline).toLocaleDateString()}
                  <DeadlineIndicator deadline={request.regulatory_deadline} status={request.status} />
                </dd>
              </div>
            )}
            <div>
              <dt className="text-fg-muted mb-0.5">Created</dt>
              <dd className="font-medium text-fg">
                {new Date(request.created_at).toLocaleString()}
              </dd>
            </div>
            {request.approved_at && (
              <div>
                <dt className="text-fg-muted mb-0.5">Approved</dt>
                <dd className="font-medium text-fg">
                  {new Date(request.approved_at).toLocaleString()}
                </dd>
              </div>
            )}
            {request.completed_at && (
              <div>
                <dt className="text-fg-muted mb-0.5">Completed</dt>
                <dd className="font-medium text-fg">
                  {new Date(request.completed_at).toLocaleString()}
                </dd>
              </div>
            )}
            {request.source_reference && (
              <div className="sm:col-span-2">
                <dt className="text-fg-muted mb-0.5">Notes</dt>
                <dd className="font-medium text-fg">{request.source_reference}</dd>
              </div>
            )}
            {request.cancelled_reason && (
              <div className="sm:col-span-2">
                <dt className="text-fg-muted mb-0.5">Cancellation Reason</dt>
                <dd className="font-medium text-error">{request.cancelled_reason}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Actions — only show when there are actions to take */}
      {request.status !== "completed" && request.status !== "cancelled" && request.status !== "rejected" && (
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Actions</h2>
          <RequestActions
            requestId={request.id}
            status={request.status}
            subjectEmail={request.subject_email}
            failedStepId={failedStep?.id}
          />
        </div>
      )}

      {/* Compliance report export — show for completed requests */}
      {request.status === "completed" && (
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fg">Compliance Report</h2>
              <p className="text-[12px] text-fg-muted mt-0.5">
                Download a confirmation report for your records
              </p>
            </div>
            <ExportReportButton
              requestId={request.id}
              subjectEmail={request.subject_email}
              subjectName={request.subject_name ?? request.subject_email}
              subjectType={request.subject_type}
              requestType={request.request_type}
              regulation={request.regulation}
              createdAt={request.created_at}
              approvedAt={request.approved_at}
              completedAt={request.completed_at}
              notificationEmail={(request as Record<string, unknown>).notification_email as string | null}
              notificationSentAt={(request as Record<string, unknown>).notification_sent_at as string | null}
              notificationMethod={(request as Record<string, unknown>).notification_method as string | null}
              steps={steps}
            />
          </div>
        </div>
      )}

      {/* Subject notification tracking */}
      {request.status === "completed" && (
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-3">Subject Notification</h2>
          <NotificationTracker
            requestId={request.id}
            subjectEmail={request.subject_email}
            notificationEmail={(request as Record<string, unknown>).notification_email as string | null}
            notificationSentAt={(request as Record<string, unknown>).notification_sent_at as string | null}
            notificationMethod={(request as Record<string, unknown>).notification_method as string | null}
          />
        </div>
      )}

      {/* Pipeline Progress */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <PipelineProgress
          key={`${request.id}-${request.status}-${completedSteps}`}
          requestId={request.id}
          requestStatus={request.status}
          initialSteps={steps}
        />
      </div>
    </div>
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
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
        styles[status] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function DeadlineIndicator({ deadline, status }: { deadline: string; status: string }) {
  if (status === "completed" || status === "cancelled") return null;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining < 0) {
    return (
      <span className="ml-2 text-[11px] font-semibold text-error">
        OVERDUE by {Math.abs(daysRemaining)} days
      </span>
    );
  }
  if (daysRemaining <= 7) {
    return (
      <span className="ml-2 text-[11px] font-semibold text-warning">
        {daysRemaining} days remaining
      </span>
    );
  }
  return (
    <span className="ml-2 text-[11px] text-fg-muted">
      {daysRemaining} days remaining
    </span>
  );
}

function formatSource(source: string): string {
  const labels: Record<string, string> = {
    user_self_service: "User self-service",
    admin_initiated: "Admin initiated",
    email_request: "Email request",
    legal_request: "Legal request",
  };
  return labels[source] ?? source;
}
