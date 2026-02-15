import { notFound } from "next/navigation";
import { createServiceClient } from "@fanflet/db/service";
import { Card, CardContent, CardHeader, CardTitle } from "@fanflet/ui/card";
import Link from "next/link";
import { ArrowLeft, ExternalLink, User } from "lucide-react";
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

  // Fetch related data
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/accounts"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accounts
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {speaker.photo_url ? (
              <img
                src={speaker.photo_url}
                alt={speaker.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {speaker.name || "Unnamed Speaker"}
            </h1>
            <p className="text-muted-foreground">{speaker.email}</p>
            {speaker.slug && (
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
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

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fanflets</p>
            <p className="text-2xl font-bold">{fanflets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Subscribers</p>
            <p className="text-2xl font-bold">{subscriberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Analytics Events</p>
            <p className="text-2xl font-bold">{totalEvents.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-2xl font-bold">
              {subscription ? (subscription as Record<string, unknown>).plans
                ? ((subscription as Record<string, unknown>).plans as Record<string, unknown>).display_name as string
                : "Unknown"
                : "Free"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{speaker.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{speaker.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-mono">{speaker.slug ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{new Date(speaker.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Bio</dt>
              <dd>{speaker.bio || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Suspension Info (if suspended) */}
      {speaker.status === "suspended" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">Suspension Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-700">
            <p>
              <strong>Suspended at:</strong>{" "}
              {speaker.suspended_at
                ? new Date(speaker.suspended_at).toLocaleString()
                : "Unknown"}
            </p>
            {speaker.suspension_reason && (
              <p className="mt-1">
                <strong>Reason:</strong> {speaker.suspension_reason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fanflets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Fanflets ({fanflets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fanflets.length > 0 ? (
            <div className="space-y-2">
              {fanflets.map((fanflet) => (
                <div
                  key={fanflet.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{fanflet.title}</span>
                    <FanfletStatusBadge status={fanflet.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {new Date(fanflet.created_at).toLocaleDateString()}
                    </span>
                    {fanflet.status === "published" && speaker.slug && (
                      <a
                        href={`https://fanflet.com/${speaker.slug}/${fanflet.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No fanflets created</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    suspended: "bg-amber-100 text-amber-700",
    deactivated: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function FanfletStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700",
    draft: "bg-slate-100 text-slate-600",
    archived: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </span>
  );
}
