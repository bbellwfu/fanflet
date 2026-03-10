import { notFound } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDate } from "@fanflet/db/timezone";
import Link from "next/link";
import { ArrowLeft, BuildingIcon, GlobeIcon, MailIcon } from "lucide-react";
import { VerifyButton } from "./verify-button";
import { ImpersonateButton } from "../../accounts/[id]/impersonate-button";

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const { data: adminPrefs } = await supabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user!.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  const { data: sponsor, error } = await supabase
    .from("sponsor_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !sponsor) {
    notFound();
  }

  const [connectionResult, leadResult, activeConnectionResult] =
    await Promise.all([
      supabase
        .from("sponsor_connections")
        .select("id", { count: "exact", head: true })
        .eq("sponsor_id", id),
      supabase
        .from("sponsor_leads")
        .select("id", { count: "exact", head: true })
        .eq("sponsor_id", id),
      supabase
        .from("sponsor_connections")
        .select("id", { count: "exact", head: true })
        .eq("sponsor_id", id)
        .eq("status", "active"),
    ]);

  const totalConnections = connectionResult.count ?? 0;
  const activeConnections = activeConnectionResult.count ?? 0;
  const totalLeads = leadResult.count ?? 0;

  const statItems = [
    { label: "Total Connections", value: totalConnections },
    { label: "Active Connections", value: activeConnections },
    { label: "Leads Generated", value: totalLeads },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/sponsors"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sponsors
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-surface-elevated flex shrink-0 items-center justify-center overflow-hidden">
            {sponsor.logo_url ? (
              <img
                src={sponsor.logo_url}
                alt={sponsor.company_name}
                className="w-full h-full object-contain"
              />
            ) : (
              <BuildingIcon className="w-6 h-6 text-fg-secondary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {sponsor.company_name}
            </h1>
            <p className="text-sm text-fg-secondary">{sponsor.contact_email}</p>
            <p className="text-[12px] font-mono text-fg-muted mt-0.5">
              /{sponsor.slug}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge verified={sponsor.is_verified} />
          <VerifyButton
            sponsorId={sponsor.id}
            isVerified={sponsor.is_verified}
          />
          {sponsor.auth_user_id && (
            <ImpersonateButton
              targetUserId={sponsor.auth_user_id}
              targetRole="sponsor"
              targetName={sponsor.company_name}
              targetEmail={sponsor.contact_email}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-surface rounded-lg border border-border-subtle p-5"
          >
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
              {item.label}
            </p>
            <p className="text-2xl font-semibold text-fg tracking-tight">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Company Details</h2>
        </div>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-fg-muted mb-0.5">Company Name</dt>
              <dd className="font-medium text-fg">{sponsor.company_name}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Contact Email</dt>
              <dd className="font-medium text-fg flex items-center gap-1.5">
                <MailIcon className="w-3.5 h-3.5 text-fg-muted" />
                {sponsor.contact_email}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Slug</dt>
              <dd className="font-mono text-fg">{sponsor.slug}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Industry</dt>
              <dd className="text-fg">{sponsor.industry ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Website</dt>
              <dd className="text-fg">
                {sponsor.website_url ? (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-soft hover:text-primary flex items-center gap-1"
                  >
                    <GlobeIcon className="w-3.5 h-3.5" />
                    {sponsor.website_url}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Joined</dt>
              <dd className="text-fg">
                {formatDate(sponsor.created_at, adminTimezone)}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-fg-muted mb-0.5">Description</dt>
              <dd className="text-fg">{sponsor.description ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
        verified
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      }`}
    >
      {verified ? "Verified" : "Pending"}
    </span>
  );
}
