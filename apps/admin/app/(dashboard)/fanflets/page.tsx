import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDate } from "@fanflet/db/timezone";
import Link from "next/link";
import { ExternalLink, FileTextIcon } from "lucide-react";
import { getNonDemoScope } from "../analytics/actions";

type SpeakerEmbed = { name: string | null; email: string; slug: string | null };

type FanfletRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  speaker_id: string;
  speakers: SpeakerEmbed | SpeakerEmbed[] | null;
};

function resolveSpeaker(
  speakers: FanfletRow["speakers"],
): SpeakerEmbed | null {
  if (!speakers) return null;
  if (Array.isArray(speakers)) return speakers[0] ?? null;
  return speakers;
}

export default async function FanfletsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const webUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = createServiceClient();

  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const { data: adminPrefs } = await supabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user!.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  const { speakerIds } = await getNonDemoScope(supabase);

  let query = supabase
    .from("fanflets")
    .select("id, title, slug, status, published_at, created_at, speaker_id, speakers(name, email, slug)")
    .in("speaker_id", speakerIds)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: fanflets, error } = await query;

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load fanflets: {error.message}
      </div>
    );
  }

  const rows = (fanflets ?? []) as unknown as FanfletRow[];
  const publishedCount = rows.filter((f) => f.status === "published").length;
  const draftCount = rows.filter((f) => f.status === "draft").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Fanflets
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          All fanflets across the platform
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/fanflets"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            (params.status ?? "all") === "all"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          All
        </Link>
        <Link
          href="/fanflets?status=published"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.status === "published"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          Published
        </Link>
        <Link
          href="/fanflets?status=draft"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.status === "draft"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          Draft
        </Link>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center">
            <FileTextIcon className="w-4 h-4 text-info" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {rows.length} Fanflet{rows.length !== 1 ? "s" : ""}
            {(params.status ?? "all") === "all" && (
              <span className="text-fg-muted font-normal ml-1.5">
                ({publishedCount} published, {draftCount} draft)
              </span>
            )}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Title
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Speaker
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Slug
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Status
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Published
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((fanflet) => {
                const speaker = resolveSpeaker(fanflet.speakers);
                const publicUrl =
                  speaker?.slug
                    ? `${webUrl}/${speaker.slug}/${fanflet.slug}?preview`
                    : null;

                return (
                  <tr
                    key={fanflet.id}
                    className="hover:bg-surface-elevated/50 transition-colors min-h-[44px]"
                  >
                    <td className="px-5 py-3.5 font-medium text-fg whitespace-nowrap align-middle">
                      {fanflet.title}
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <Link
                        href={`/accounts/${fanflet.speaker_id}`}
                        className="text-primary-soft hover:text-primary transition-colors py-2 -my-2 block whitespace-nowrap"
                      >
                        {speaker?.name || speaker?.email || "—"}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5 font-mono text-[11px] align-middle">
                      {publicUrl ? (
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-soft hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          {fanflet.slug}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-fg-muted">{fanflet.slug}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          fanflet.status === "published"
                            ? "bg-success/10 text-success"
                            : "bg-surface-elevated text-fg-muted"
                        }`}
                      >
                        {fanflet.status}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5 text-[12px] text-fg-muted align-middle">
                      {fanflet.published_at
                        ? formatDate(fanflet.published_at, adminTimezone)
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-fg-muted align-middle">
                      {formatDate(fanflet.created_at, adminTimezone)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No fanflets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
