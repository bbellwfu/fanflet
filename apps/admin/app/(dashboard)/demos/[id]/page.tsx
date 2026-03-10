import { notFound } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDateTime } from "@fanflet/db/timezone";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLinkIcon,
  FileTextIcon,
  BuildingIcon,
  ClockIcon,
} from "lucide-react";
import { ImpersonateButton } from "../../accounts/[id]/impersonate-button";
import { DemoActions } from "./demo-actions";
import { DemoProvisioningBanner } from "./demo-provisioning-banner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    provisioning: "bg-primary/10 text-primary",
    active: "bg-success/10 text-success",
    failed: "bg-error/10 text-error",
    converted: "bg-primary/10 text-primary",
    expired: "bg-warning/10 text-warning",
    deleted: "bg-surface-elevated text-fg-muted",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
        styles[status] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {status}
    </span>
  );
}

export default async function DemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();
  const webUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

  const { data: demo, error } = await supabase
    .from("demo_environments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !demo) {
    notFound();
  }

  const manifest = demo.seed_manifest as {
    auth_user_id?: string;
    speaker_id?: string;
    speaker_slug?: string;
    fanflets?: Array<{ id: string; slug: string; title: string }>;
    sponsor_account_ids?: string[];
    resource_block_ids?: string[];
    survey_question_ids?: string[];
  } | null;

  const aiPayload = demo.ai_generated_payload as {
    bio?: string;
    talks?: Array<{ title: string; event_name: string; resources?: unknown[] }>;
    sponsors?: Array<{ company_name: string }>;
    survey_questions?: string[];
  } | null;

  // Fetch speaker details if available
  let speakerName: string | null = null;
  let speakerEmail: string | null = null;
  let speakerAuthUserId: string | null = null;
  if (demo.speaker_id) {
    const { data: speaker } = await supabase
      .from("speakers")
      .select("name, email, auth_user_id")
      .eq("id", demo.speaker_id)
      .single();
    speakerName = speaker?.name ?? null;
    speakerEmail = speaker?.email ?? null;
    speakerAuthUserId = speaker?.auth_user_id as string ?? null;
  }

  const publicUrls = (manifest?.fanflets ?? []).map(
    (f) => ({
      title: f.title,
      url: `${webUrl}/${manifest?.speaker_slug}/${f.slug}`,
    }),
  );

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/demos"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Demos
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {demo.prospect_name}
            </h1>
            <StatusBadge status={demo.status} />
          </div>
          <p className="text-sm text-fg-secondary">
            {demo.prospect_specialty}
            {demo.prospect_email && ` · ${demo.prospect_email}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {demo.status === "active" && speakerAuthUserId && (
            <ImpersonateButton
              targetUserId={speakerAuthUserId}
              targetRole="speaker"
              targetName={speakerName ?? demo.prospect_name}
              targetEmail={speakerEmail ?? `demo+${manifest?.speaker_slug}@fanflet.com`}
              defaultReason="For Demo Purposes"
              defaultWriteEnabled
            />
          )}
          <DemoActions
            demoId={id}
            status={demo.status}
          />
        </div>
      </div>

      {/* Provisioning Banner (auto-polls and refreshes) */}
      <DemoProvisioningBanner demoId={id} initialStatus={demo.status} />

      {/* Error Message */}
      {demo.status === "failed" && demo.error_message && (
        <div className="bg-error/5 rounded-lg border border-error/20 p-5">
          <p className="text-sm font-medium text-error mb-1">
            Provisioning Error
          </p>
          <p className="text-[13px] text-fg-secondary">
            {demo.error_message}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Fanflets
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {manifest?.fanflets?.length ?? 0}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Sponsors
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {manifest?.sponsor_account_ids?.length ?? aiPayload?.sponsors?.length ?? 0}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Resources
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {manifest?.resource_block_ids?.length ?? 0}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Status
          </p>
          <StatusBadge status={demo.status} />
        </div>
      </div>

      {/* Details */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Demo Details</h2>
        </div>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-fg-muted mb-0.5">Prospect Name</dt>
              <dd className="text-fg font-medium">{demo.prospect_name}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Specialty</dt>
              <dd className="text-fg">{demo.prospect_specialty}</dd>
            </div>
            {demo.prospect_email && (
              <div>
                <dt className="text-fg-muted mb-0.5">Email</dt>
                <dd className="text-fg">{demo.prospect_email}</dd>
              </div>
            )}
            {manifest?.speaker_slug && (
              <div>
                <dt className="text-fg-muted mb-0.5">Speaker Slug</dt>
                <dd className="text-fg font-mono text-[12px]">
                  /{manifest.speaker_slug}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-fg-muted mb-0.5">Created</dt>
              <dd className="text-fg">
                {formatDateTime(demo.created_at, adminTimezone)}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5 flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                Expires
              </dt>
              <dd className="text-fg">
                {formatDateTime(demo.expires_at, adminTimezone)}
              </dd>
            </div>
            {demo.prospect_notes && (
              <div className="md:col-span-2">
                <dt className="text-fg-muted mb-0.5">Notes</dt>
                <dd className="text-fg whitespace-pre-wrap">
                  {demo.prospect_notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Public URLs */}
      {publicUrls.length > 0 && (
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
            <FileTextIcon className="w-4 h-4 text-primary-soft" />
            <h2 className="text-sm font-semibold text-fg">
              Public Fanflet URLs
            </h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {publicUrls.map((item) => (
              <div
                key={item.url}
                className="px-5 py-3.5 flex items-center justify-between"
              >
                <div>
                  <p className="text-[13px] font-medium text-fg">
                    {item.title}
                  </p>
                  <p className="text-[12px] text-fg-muted font-mono">
                    {item.url}
                  </p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-soft"
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Generated Content Preview */}
      {aiPayload && (
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
            <BuildingIcon className="w-4 h-4 text-primary-soft" />
            <h2 className="text-sm font-semibold text-fg">
              AI-Generated Content
            </h2>
          </div>
          <div className="px-5 py-4 space-y-4 text-[13px]">
            {aiPayload.bio && (
              <div>
                <p className="text-fg-muted mb-1 font-medium">Bio</p>
                <p className="text-fg">{aiPayload.bio}</p>
              </div>
            )}
            {aiPayload.talks && (
              <div>
                <p className="text-fg-muted mb-1 font-medium">Talks</p>
                <ul className="space-y-1">
                  {aiPayload.talks.map((talk, i) => (
                    <li key={i} className="text-fg">
                      {talk.title}{" "}
                      <span className="text-fg-muted">
                        at {talk.event_name} ({talk.resources?.length ?? 0}{" "}
                        resources)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiPayload.sponsors && (
              <div>
                <p className="text-fg-muted mb-1 font-medium">Sponsors</p>
                <ul className="space-y-0.5">
                  {aiPayload.sponsors.map((s, i) => (
                    <li key={i} className="text-fg">
                      {s.company_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiPayload.survey_questions && (
              <div>
                <p className="text-fg-muted mb-1 font-medium">
                  Survey Questions
                </p>
                <ul className="space-y-0.5">
                  {aiPayload.survey_questions.map((q, i) => (
                    <li key={i} className="text-fg">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
