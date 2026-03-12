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
  UsersIcon,
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

function ConnectionBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    active: { bg: "bg-success/10 text-success", label: "Connected" },
    pending: { bg: "bg-warning/10 text-warning", label: "Pending" },
    none: { bg: "bg-surface-elevated text-fg-muted", label: "Not Connected" },
  };
  const c = config[status] ?? config.none;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${c.bg}`}>
      {c.label}
    </span>
  );
}

interface SponsorManifest {
  sponsor_auth_user_id?: string;
  sponsor_account_id?: string;
  sponsor_slug?: string;
  sponsor_resource_ids?: string[];
  lead_ids?: string[];
  demo_speakers?: Array<{
    auth_user_id: string;
    speaker_id: string;
    speaker_name: string;
    speaker_slug: string;
    connection_status: "active" | "none" | "pending";
    fanflet_ids?: string[];
  }>;
}

interface SpeakerManifest {
  auth_user_id?: string;
  speaker_id?: string;
  speaker_slug?: string;
  fanflets?: Array<{ id: string; slug: string; title: string }>;
  sponsor_account_ids?: string[];
  resource_block_ids?: string[];
  survey_question_ids?: string[];
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
  const { data: { user } } = await authSupabase.auth.getUser();
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

  if (error || !demo) notFound();

  const demoType = (demo.demo_type as string) || "speaker";
  const isSponsorDemo = demoType === "sponsor";

  if (isSponsorDemo) {
    return (
      <SponsorDemoDetail
        demo={demo}
        demoId={id}
        webUrl={webUrl}
        adminTimezone={adminTimezone}
      />
    );
  }

  return (
    <SpeakerDemoDetail
      demo={demo}
      demoId={id}
      webUrl={webUrl}
      adminTimezone={adminTimezone}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Speaker Demo Detail (existing behavior)                            */
/* ------------------------------------------------------------------ */

async function SpeakerDemoDetail({
  demo,
  demoId,
  webUrl,
  adminTimezone,
}: {
  demo: Record<string, unknown>;
  demoId: string;
  webUrl: string;
  adminTimezone: string | null;
}) {
  const supabase = createServiceClient();
  const manifest = demo.seed_manifest as SpeakerManifest | null;

  const aiPayload = demo.ai_generated_payload as {
    bio?: string;
    talks?: Array<{ title: string; event_name: string; resources?: unknown[] }>;
    sponsors?: Array<{ company_name: string }>;
    survey_questions?: string[];
  } | null;

  let speakerName: string | null = null;
  let speakerEmail: string | null = null;
  let speakerAuthUserId: string | null = null;
  if (demo.speaker_id) {
    const { data: speaker } = await supabase
      .from("speakers")
      .select("name, email, auth_user_id")
      .eq("id", demo.speaker_id as string)
      .single();
    speakerName = speaker?.name ?? null;
    speakerEmail = speaker?.email ?? null;
    speakerAuthUserId = speaker?.auth_user_id as string ?? null;
  }

  const publicUrls = (manifest?.fanflets ?? []).map((f) => ({
    title: f.title,
    url: `${webUrl}/${manifest?.speaker_slug}/${f.slug}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/demos" className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg">
          <ArrowLeft className="w-4 h-4" />
          Back to Demos
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">{demo.prospect_name as string}</h1>
            <StatusBadge status={demo.status as string} />
          </div>
          <p className="text-sm text-fg-secondary">
            {demo.prospect_specialty as string}
            {demo.prospect_email ? ` · ${demo.prospect_email as string}` : null}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {demo.status === "active" && speakerAuthUserId && (
            <ImpersonateButton
              targetUserId={speakerAuthUserId}
              targetRole="speaker"
              targetName={speakerName ?? (demo.prospect_name as string)}
              targetEmail={speakerEmail ?? `demo+${manifest?.speaker_slug}@fanflet.com`}
              defaultReason="For Demo Purposes"
              defaultWriteEnabled
            />
          )}
          <DemoActions demoId={demoId} status={demo.status as string} hasProspectEmail={!!demo.prospect_email} />
        </div>
      </div>

      <DemoProvisioningBanner demoId={demoId} initialStatus={demo.status as string} />

      {demo.status === "failed" && Boolean(demo.error_message) && (
        <div className="bg-error/5 rounded-lg border border-error/20 p-5">
          <p className="text-sm font-medium text-error mb-1">Provisioning Error</p>
          <p className="text-[13px] text-fg-secondary">{demo.error_message as string}</p>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Fanflets" value={manifest?.fanflets?.length ?? 0} />
        <StatCard label="Sponsors" value={manifest?.sponsor_account_ids?.length ?? aiPayload?.sponsors?.length ?? 0} />
        <StatCard label="Resources" value={manifest?.resource_block_ids?.length ?? 0} />
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">Status</p>
          <StatusBadge status={demo.status as string} />
        </div>
      </div>

      <DemoDetailsCard demo={demo} manifest={manifest} adminTimezone={adminTimezone} />

      {publicUrls.length > 0 && (
        <UrlsList title="Public Fanflet URLs" urls={publicUrls} />
      )}

      {aiPayload && <AiContentPreview payload={aiPayload} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sponsor Demo Detail (control center)                               */
/* ------------------------------------------------------------------ */

async function SponsorDemoDetail({
  demo,
  demoId,
  webUrl,
  adminTimezone,
}: {
  demo: Record<string, unknown>;
  demoId: string;
  webUrl: string;
  adminTimezone: string | null;
}) {
  const supabase = createServiceClient();
  const manifest = demo.seed_manifest as SponsorManifest | null;

  // Fetch sponsor account info
  let sponsorName: string | null = null;
  let sponsorEmail: string | null = null;
  let sponsorAuthUserId: string | null = manifest?.sponsor_auth_user_id ?? null;

  if (demo.sponsor_id) {
    const { data: sponsor } = await supabase
      .from("sponsor_accounts")
      .select("company_name, contact_email, auth_user_id")
      .eq("id", demo.sponsor_id as string)
      .single();
    sponsorName = sponsor?.company_name ?? null;
    sponsorEmail = sponsor?.contact_email ?? null;
    sponsorAuthUserId = sponsor?.auth_user_id as string ?? sponsorAuthUserId;
  }

  // Fetch speaker info for each demo speaker
  const demoSpeakers = manifest?.demo_speakers ?? [];
  const speakerDetails: Array<{
    auth_user_id: string;
    speaker_id: string;
    speaker_name: string;
    speaker_slug: string;
    connection_status: string;
    email: string | null;
    fanflet_count: number;
  }> = [];

  for (const ds of demoSpeakers) {
    const { data: speaker } = await supabase
      .from("speakers")
      .select("name, email, slug")
      .eq("id", ds.speaker_id)
      .single();

    speakerDetails.push({
      auth_user_id: ds.auth_user_id,
      speaker_id: ds.speaker_id,
      speaker_name: speaker?.name ?? ds.speaker_name,
      speaker_slug: speaker?.slug ?? ds.speaker_slug,
      connection_status: ds.connection_status,
      email: speaker?.email ?? null,
      fanflet_count: ds.fanflet_ids?.length ?? 0,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/demos" className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg">
          <ArrowLeft className="w-4 h-4" />
          Back to Demos
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-fg tracking-tight">{demo.prospect_name as string}</h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
              SPONSOR DEMO
            </span>
            <StatusBadge status={demo.status as string} />
          </div>
          <p className="text-sm text-fg-secondary">
            {(demo.prospect_specialty as string) || "Sponsor"}
            {demo.prospect_email ? ` · ${demo.prospect_email as string}` : null}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {demo.status === "active" && sponsorAuthUserId && (
            <ImpersonateButton
              targetUserId={sponsorAuthUserId}
              targetRole="sponsor"
              targetName={sponsorName ?? (demo.prospect_name as string)}
              targetEmail={sponsorEmail ?? ""}
              defaultReason="For Demo Purposes"
              defaultWriteEnabled
            />
          )}
          <DemoActions demoId={demoId} status={demo.status as string} hasProspectEmail={!!demo.prospect_email} />
        </div>
      </div>

      <DemoProvisioningBanner demoId={demoId} initialStatus={demo.status as string} />

      {demo.status === "failed" && Boolean(demo.error_message) && (
        <div className="bg-error/5 rounded-lg border border-error/20 p-5">
          <p className="text-sm font-medium text-error mb-1">Provisioning Error</p>
          <p className="text-[13px] text-fg-secondary">{demo.error_message as string}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Resources" value={manifest?.sponsor_resource_ids?.length ?? 0} />
        <StatCard label="Speakers" value={demoSpeakers.length} />
        <StatCard label="Leads" value={manifest?.lead_ids?.length ?? 0} />
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">Status</p>
          <StatusBadge status={demo.status as string} />
        </div>
      </div>

      {/* Speaker Accounts — the key part of the control center */}
      {speakerDetails.length > 0 && demo.status === "active" && (
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
            <UsersIcon className="w-4 h-4 text-primary-soft" />
            <h2 className="text-sm font-semibold text-fg">
              Speaker Accounts
            </h2>
            <span className="text-[12px] text-fg-muted ml-auto">
              Quick-switch between perspectives during a demo
            </span>
          </div>
          <div className="divide-y divide-border-subtle">
            {speakerDetails.map((s) => (
              <div key={s.speaker_id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-medium text-fg truncate">
                      {s.speaker_name}
                    </p>
                    <ConnectionBadge status={s.connection_status} />
                  </div>
                  <p className="text-[12px] text-fg-muted">
                    /{s.speaker_slug}
                    {s.fanflet_count > 0 && ` · ${s.fanflet_count} fanflet${s.fanflet_count !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`${webUrl}/${s.speaker_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg-muted hover:text-primary"
                    title="View public profile"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </a>
                  <ImpersonateButton
                    targetUserId={s.auth_user_id}
                    targetRole="speaker"
                    targetName={s.speaker_name}
                    targetEmail={s.email ?? `demo+${s.speaker_slug}@fanflet.com`}
                    defaultReason="For Demo Purposes"
                    defaultWriteEnabled
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo details */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Demo Details</h2>
        </div>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-fg-muted mb-0.5">Company Name</dt>
              <dd className="text-fg font-medium">{demo.prospect_name as string}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Industry</dt>
              <dd className="text-fg">{(demo.prospect_specialty as string) || "—"}</dd>
            </div>
            {Boolean(demo.prospect_email) && (
              <div>
                <dt className="text-fg-muted mb-0.5">Contact Email</dt>
                <dd className="text-fg">{demo.prospect_email as string}</dd>
              </div>
            )}
            {manifest?.sponsor_slug && (
              <div>
                <dt className="text-fg-muted mb-0.5">Sponsor Slug</dt>
                <dd className="text-fg font-mono text-[12px]">/{manifest.sponsor_slug}</dd>
              </div>
            )}
            <div>
              <dt className="text-fg-muted mb-0.5">Created</dt>
              <dd className="text-fg">{formatDateTime(demo.created_at as string, adminTimezone)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5 flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                Expires
              </dt>
              <dd className="text-fg">{formatDateTime(demo.expires_at as string, adminTimezone)}</dd>
            </div>
            {Boolean(demo.prospect_notes) && (
              <div className="md:col-span-2">
                <dt className="text-fg-muted mb-0.5">Notes</dt>
                <dd className="text-fg whitespace-pre-wrap">{demo.prospect_notes as string}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface rounded-lg border border-border-subtle p-5">
      <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">{label}</p>
      <p className="text-2xl font-semibold text-fg tracking-tight">{value}</p>
    </div>
  );
}

function DemoDetailsCard({
  demo,
  manifest,
  adminTimezone,
}: {
  demo: Record<string, unknown>;
  manifest: SpeakerManifest | null;
  adminTimezone: string | null;
}) {
  return (
    <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-fg">Demo Details</h2>
      </div>
      <div className="px-5 py-4">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-fg-muted mb-0.5">Prospect Name</dt>
            <dd className="text-fg font-medium">{demo.prospect_name as string}</dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Specialty</dt>
            <dd className="text-fg">{demo.prospect_specialty as string}</dd>
          </div>
          {Boolean(demo.prospect_email) && (
            <div>
              <dt className="text-fg-muted mb-0.5">Email</dt>
              <dd className="text-fg">{demo.prospect_email as string}</dd>
            </div>
          )}
          {manifest?.speaker_slug && (
            <div>
              <dt className="text-fg-muted mb-0.5">Speaker Slug</dt>
              <dd className="text-fg font-mono text-[12px]">/{manifest.speaker_slug}</dd>
            </div>
          )}
          <div>
            <dt className="text-fg-muted mb-0.5">Created</dt>
            <dd className="text-fg">{formatDateTime(demo.created_at as string, adminTimezone)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              Expires
            </dt>
            <dd className="text-fg">{formatDateTime(demo.expires_at as string, adminTimezone)}</dd>
          </div>
          {Boolean(demo.prospect_notes) && (
            <div className="md:col-span-2">
              <dt className="text-fg-muted mb-0.5">Notes</dt>
              <dd className="text-fg whitespace-pre-wrap">{demo.prospect_notes as string}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function UrlsList({ title, urls }: { title: string; urls: Array<{ title: string; url: string }> }) {
  return (
    <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
        <FileTextIcon className="w-4 h-4 text-primary-soft" />
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      <div className="divide-y divide-border-subtle">
        {urls.map((item) => (
          <div key={item.url} className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-fg">{item.title}</p>
              <p className="text-[12px] text-fg-muted font-mono">{item.url}</p>
            </div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-soft">
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiContentPreview({
  payload,
}: {
  payload: {
    bio?: string;
    talks?: Array<{ title: string; event_name: string; resources?: unknown[] }>;
    sponsors?: Array<{ company_name: string }>;
    survey_questions?: string[];
  };
}) {
  return (
    <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
        <BuildingIcon className="w-4 h-4 text-primary-soft" />
        <h2 className="text-sm font-semibold text-fg">AI-Generated Content</h2>
      </div>
      <div className="px-5 py-4 space-y-4 text-[13px]">
        {payload.bio && (
          <div>
            <p className="text-fg-muted mb-1 font-medium">Bio</p>
            <p className="text-fg">{payload.bio}</p>
          </div>
        )}
        {payload.talks && (
          <div>
            <p className="text-fg-muted mb-1 font-medium">Talks</p>
            <ul className="space-y-1">
              {payload.talks.map((talk, i) => (
                <li key={i} className="text-fg">
                  {talk.title}{" "}
                  <span className="text-fg-muted">at {talk.event_name} ({talk.resources?.length ?? 0} resources)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {payload.sponsors && (
          <div>
            <p className="text-fg-muted mb-1 font-medium">Sponsors</p>
            <ul className="space-y-0.5">
              {payload.sponsors.map((s, i) => (
                <li key={i} className="text-fg">{s.company_name}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.survey_questions && (
          <div>
            <p className="text-fg-muted mb-1 font-medium">Survey Questions</p>
            <ul className="space-y-0.5">
              {payload.survey_questions.map((q, i) => (
                <li key={i} className="text-fg">{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
