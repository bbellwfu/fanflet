import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDateTime } from "@fanflet/db/timezone";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  SendIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { ResendFailedButton } from "./resend-failed-button";

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("*")
    .eq("id", id)
    .single();

  if (!comm) notFound();

  const { data: variants } = await supabase
    .from("platform_communication_variants")
    .select("*")
    .eq("communication_id", id);

  const speakerVariant = (variants ?? []).find(
    (v) => v.audience_type === "speaker"
  );

  const { data: deliveries } = await supabase
    .from("communication_deliveries")
    .select("id, recipient_id, email_provider, provider_message_id, sent_at")
    .eq("communication_id", id)
    .order("sent_at", { ascending: false });

  const allDeliveries = deliveries ?? [];
  const successCount = allDeliveries.filter(
    (d) => d.provider_message_id
  ).length;
  const failCount = allDeliveries.length - successCount;

  // Resolve speaker names for deliveries
  const recipientIds = [
    ...new Set(allDeliveries.map((d) => d.recipient_id).filter(Boolean)),
  ];
  const speakerMap = new Map<string, { name: string; email: string }>();
  if (recipientIds.length > 0) {
    const { data: speakers } = await supabase
      .from("speakers")
      .select("id, name, email")
      .in("id", recipientIds);
    for (const s of speakers ?? []) {
      speakerMap.set(s.id, { name: s.name ?? "Unknown", email: s.email });
    }
  }

  // Look up who created this
  let creatorEmail = "Unknown";
  const { data: creatorData } = await supabase.auth.admin.getUserById(
    comm.created_by_admin_id
  );
  if (creatorData?.user?.email) creatorEmail = creatorData.user.email;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/communications">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {comm.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-fg-secondary mt-1">
          <span className="inline-flex items-center gap-1">
            <SendIcon className="w-3.5 h-3.5" />
            {comm.status === "sent" ? "Sent" : comm.status}
          </span>
          {comm.sent_at && (
            <span>{formatDateTime(comm.sent_at, adminTimezone)}</span>
          )}
          <span>by {creatorEmail}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Recipients
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-fg-muted" />
            {allDeliveries.length}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Delivered
          </p>
          <p className="text-2xl font-semibold text-success tracking-tight flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            {successCount}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Failed
          </p>
          <p
            className={`text-2xl font-semibold tracking-tight flex items-center gap-2 ${
              failCount > 0 ? "text-error" : "text-fg-muted"
            }`}
          >
            <XCircleIcon className="w-5 h-5" />
            {failCount}
          </p>
          {comm.status === "sent" && failCount > 0 && (
            <div className="mt-3">
              <ResendFailedButton
                communicationId={id}
                failedCount={failCount}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content preview */}
      {speakerVariant && (
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-fg">
              Speaker variant
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <p className="text-[12px] font-medium text-fg-muted mb-0.5">
                Subject
              </p>
              <p className="text-[14px] text-fg">{speakerVariant.subject}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-fg-muted mb-0.5">
                Body
              </p>
              <div
                className="prose prose-sm max-w-none text-fg"
                dangerouslySetInnerHTML={{ __html: speakerVariant.body_html }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {comm.source_reference && (
        <div className="bg-surface rounded-lg border border-border-subtle px-5 py-4">
          <p className="text-[12px] font-medium text-fg-muted mb-0.5">
            Source reference
          </p>
          <p className="text-[13px] text-fg">{comm.source_reference}</p>
        </div>
      )}

      {/* Delivery log */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">
            Delivery log ({allDeliveries.length})
          </h2>
        </div>
        {allDeliveries.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {allDeliveries.map((d) => {
              const speaker = d.recipient_id
                ? speakerMap.get(d.recipient_id)
                : null;
              const succeeded = !!d.provider_message_id;
              return (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  {succeeded ? (
                    <CheckCircleIcon className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-error shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-fg truncate">
                      {speaker?.name ?? "Unknown speaker"}
                    </p>
                    <p className="text-[11px] text-fg-muted truncate">
                      {speaker?.email ?? d.recipient_id}
                    </p>
                  </div>
                  <div className="text-[11px] text-fg-muted shrink-0">
                    {formatDateTime(d.sent_at, adminTimezone)}
                  </div>
                  {d.email_provider && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-fg-muted bg-surface-elevated px-1.5 py-0.5 rounded shrink-0">
                      {d.email_provider}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-fg-muted">
            No deliveries recorded
          </div>
        )}
      </div>
    </div>
  );
}
