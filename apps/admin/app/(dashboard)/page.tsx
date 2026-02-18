import { createServiceClient } from "@fanflet/db/service";
import {
  UsersIcon,
  FileTextIcon,
  MailIcon,
  BarChart3Icon,
  TrendingUpIcon,
  ActivityIcon,
  ArrowUpRightIcon,
} from "lucide-react";
import Link from "next/link";

/* ── Accent colour variants for stat cards ── */
type AccentColor = "violet" | "sky" | "emerald" | "amber" | "rose";

const accentBorder: Record<AccentColor, string> = {
  violet: "border-t-primary/60",
  sky: "border-t-info/60",
  emerald: "border-t-success/60",
  amber: "border-t-warning/60",
  rose: "border-t-error/60",
};

const accentIconBg: Record<AccentColor, string> = {
  violet: "bg-primary-muted text-primary-soft",
  sky: "bg-info/10 text-info",
  emerald: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  rose: "bg-error/10 text-error",
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: AccentColor;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = "violet",
}: StatCardProps) {
  return (
    <div
      className={`bg-surface rounded-lg border border-border-subtle border-t-2 ${accentBorder[accentColor]} p-5 min-w-0 flex flex-col`}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">
          {title}
        </p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentIconBg[accentColor]}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-semibold text-fg tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-[12px] text-fg-muted mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}

function SignupRow({
  name,
  email,
  date,
}: {
  name: string;
  email: string;
  date: string;
}) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center shrink-0">
          <span className="text-[11px] font-semibold text-fg-secondary">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg truncate">{name}</p>
          <p className="text-[12px] text-fg-muted truncate">{email}</p>
        </div>
      </div>
      <span className="text-[12px] text-fg-muted shrink-0 ml-4">{date}</span>
    </div>
  );
}

function PublishedRow({ title, date }: { title: string; date: string }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
          <FileTextIcon className="w-3.5 h-3.5 text-info" />
        </div>
        <p className="text-[13px] font-medium text-fg truncate">{title}</p>
      </div>
      <span className="text-[12px] text-fg-muted shrink-0 ml-4">{date}</span>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const supabase = createServiceClient();

  const [
    speakersResult,
    fanfletsResult,
    subscribersResult,
    pageViewsResult,
    recentSignupsResult,
    activeFanfletsResult,
  ] = await Promise.all([
    supabase.from("speakers").select("id", { count: "exact", head: true }),
    supabase.from("fanflets").select("id, status", { count: "exact" }),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "page_view"),
    supabase
      .from("speakers")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("analytics_events")
      .select("fanflet_id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  const totalSpeakers = speakersResult.count ?? 0;
  const totalFanflets = fanfletsResult.count ?? 0;
  const totalSubscribers = subscribersResult.count ?? 0;
  const totalPageViews = pageViewsResult.count ?? 0;
  const recentSignups = recentSignupsResult.count ?? 0;
  const activeFanflets7d = activeFanfletsResult.count ?? 0;

  const fanflets = fanfletsResult.data ?? [];
  const publishedCount = fanflets.filter((f) => f.status === "published").length;
  const draftCount = fanflets.filter((f) => f.status === "draft").length;

  const { data: recentSpeakers } = await supabase
    .from("speakers")
    .select("id, name, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentFanflets } = await supabase
    .from("fanflets")
    .select("id, title, status, published_at, speaker_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Platform Overview
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Key metrics across the Fanflet platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Speakers"
          value={totalSpeakers}
          icon={<UsersIcon className="w-4 h-4" />}
          accentColor="violet"
        />
        <StatCard
          title="Total Fanflets"
          value={totalFanflets}
          subtitle={`${publishedCount} published, ${draftCount} draft`}
          icon={<FileTextIcon className="w-4 h-4" />}
          accentColor="sky"
        />
        <StatCard
          title="Total Subscribers"
          value={totalSubscribers}
          icon={<MailIcon className="w-4 h-4" />}
          accentColor="emerald"
        />
        <StatCard
          title="Page Views"
          value={totalPageViews.toLocaleString()}
          icon={<BarChart3Icon className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="New Signups (30d)"
          value={recentSignups}
          icon={<TrendingUpIcon className="w-4 h-4" />}
          accentColor="violet"
        />
        <StatCard
          title="Active Fanflets (7d)"
          value={activeFanflets7d}
          icon={<ActivityIcon className="w-4 h-4" />}
          accentColor="sky"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Signups */}
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Recent Signups</h2>
            <Link
              href="/accounts"
              className="text-[12px] font-medium text-primary-soft hover:text-primary transition-colors flex items-center gap-1"
            >
              View all
              <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {recentSpeakers && recentSpeakers.length > 0 ? (
              recentSpeakers.map((speaker) => (
                <SignupRow
                  key={speaker.id}
                  name={speaker.name || "Unnamed"}
                  email={speaker.email}
                  date={new Date(speaker.created_at).toLocaleDateString()}
                />
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-fg-muted">No speakers yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recently Published */}
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">
              Recently Published
            </h2>
            <Link
              href="/features"
              className="text-[12px] font-medium text-primary-soft hover:text-primary transition-colors flex items-center gap-1"
            >
              View all
              <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {recentFanflets && recentFanflets.length > 0 ? (
              recentFanflets.map((fanflet) => (
                <PublishedRow
                  key={fanflet.id}
                  title={fanflet.title}
                  date={
                    fanflet.published_at
                      ? new Date(fanflet.published_at).toLocaleDateString()
                      : "N/A"
                  }
                />
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-fg-muted">
                  No published fanflets yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
