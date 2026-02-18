import { notFound } from "next/navigation";
import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ArrowLeft, ExternalLink, UserIcon, AlertTriangleIcon } from "lucide-react";
import { SuspendButton } from "./suspend-button";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: speaker, error } = await supabase
    .from("speakers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !speaker) {
    notFound();
  }

  const [fanfletsResult, subscribersResult, analyticsResult, subscriptionResult] =
    await Promise.all([
      supabase
        .from("fanflets")
        .select("id, title, slug, status, created_at, published_at")
        .eq("speaker_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("speaker_id", id),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .in(
          "fanflet_id",
          (
            await supabase
              .from("fanflets")
              .select("id")
              .eq("speaker_id", id)
          ).data?.map((f) => f.id) ?? []
        ),
      supabase
        .from("speaker_subscriptions")
        .select("*, plans(*)")
        .eq("speaker_id", id)
        .maybeSingle(),
    ]);

  const fanflets = fanfletsResult.data ?? [];
  const subscriberCount = subscribersResult.count ?? 0;
  const totalEvents = analyticsResult.count ?? 0;
  const subscription = subscriptionResult.data;

  const statItems = [
    { label: "Fanflets", value: fanflets.length },
    { label: "Subscribers", value: subscriberCount },
    { label: "Analytics Events", value: totalEvents.toLocaleString() },
    {
      label: "Plan",
      value: subscription
        ? (subscription as Record<string, unknown>).plans
          ? (
              (subscription as Record<string, unknown>).plans as Record<
                string,
                unknown
              >
            ).display_name as string
          : "Unknown"
        : "Free",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accounts
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-elevated flex shrink-0 items-center justify-center overflow-hidden">
            {speaker.photo_url ? (
              <img
                src={speaker.photo_url}
                alt={speaker.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-fg-secondary">
                {(speaker.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {speaker.name || "Unnamed Speaker"}
            </h1>
            <p className="text-sm text-fg-secondary">{speaker.email}</p>
            {speaker.slug && (
              <p className="text-[12px] font-mono text-fg-muted mt-0.5">
                /{speaker.slug}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={speaker.status} />
          <SuspendButton
            speakerId={speaker.id}
            currentStatus={speaker.status}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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

      {/* Profile Details */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Profile Details</h2>
        </div>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-fg-muted mb-0.5">Name</dt>
              <dd className="font-medium text-fg">{speaker.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Email</dt>
              <dd className="font-medium text-fg">{speaker.email}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Slug</dt>
              <dd className="font-mono text-fg">{speaker.slug ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-muted mb-0.5">Joined</dt>
              <dd className="text-fg">
                {new Date(speaker.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-fg-muted mb-0.5">Bio</dt>
              <dd className="text-fg">{speaker.bio || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Suspension Info */}
      {speaker.status === "suspended" && (
        <div className="bg-warning/5 rounded-lg border border-warning/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-warning/20 flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-warning">
              Suspension Details
            </h2>
          </div>
          <div className="px-5 py-4 text-[13px] text-fg-secondary space-y-1">
            <p>
              <span className="font-medium text-fg">Suspended at:</span>{" "}
              {speaker.suspended_at
                ? new Date(speaker.suspended_at).toLocaleString()
                : "Unknown"}
            </p>
            {speaker.suspension_reason && (
              <p>
                <span className="font-medium text-fg">Reason:</span>{" "}
                {speaker.suspension_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fanflets List */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">
            Fanflets ({fanflets.length})
          </h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {fanflets.length > 0 ? (
            fanflets.map((fanflet) => (
              <div
                key={fanflet.id}
                className="px-5 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[13px] font-medium text-fg truncate">
                    {fanflet.title}
                  </span>
                  <FanfletStatusBadge status={fanflet.status} />
                </div>
                <div className="flex items-center gap-3 text-[12px] text-fg-muted shrink-0 ml-4">
                  <span>
                    {new Date(fanflet.created_at).toLocaleDateString()}
                  </span>
                  {fanflet.status === "published" && speaker.slug && (
                    <a
                      href={`https://fanflet.com/${speaker.slug}/${fanflet.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-soft hover:text-primary transition-colors flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-fg-muted">No fanflets created</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/10 text-success",
    suspended: "bg-warning/10 text-warning",
    deactivated: "bg-error/10 text-error",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
        styles[status] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {status}
    </span>
  );
}

function FanfletStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-success/10 text-success",
    draft: "bg-surface-elevated text-fg-muted",
    archived: "bg-surface-elevated text-fg-muted",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
        styles[status] ?? "bg-surface-elevated text-fg-muted"
      }`}
    >
      {status}
    </span>
  );
}
