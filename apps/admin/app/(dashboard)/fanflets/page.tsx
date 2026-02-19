import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ExternalLink, FileTextIcon } from "lucide-react";

type FanfletRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  speaker_id: string;
  speakers: { name: string | null; email: string; slug: string | null } | null;
};

export default async function FanfletsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("fanflets")
    .select("id, title, slug, status, published_at, created_at, speaker_id, speakers(name, email, slug)")
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

  const rows = (fanflets ?? []) as FanfletRow[];
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
      <div className="flex gap-2">
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
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Title
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Speaker
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Slug
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Published
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Created
                </th>
                <th className="px-5 py-3 text-right text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((fanflet) => (
                <tr
                  key={fanflet.id}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-fg">
                    {fanflet.title}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/accounts/${fanflet.speaker_id}`}
                      className="text-primary-soft hover:text-primary transition-colors"
                    >
                      {fanflet.speakers?.name || fanflet.speakers?.email || "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-fg-muted font-mono text-[11px]">
                    {fanflet.slug}
                  </td>
                  <td className="px-5 py-3.5">
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
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted">
                    {fanflet.published_at
                      ? new Date(fanflet.published_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted">
                    {new Date(fanflet.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {fanflet.status === "published" && fanflet.speakers?.slug && (
                      <a
                        href={`https://fanflet.com/${fanflet.speakers.slug}/${fanflet.slug}?preview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-soft hover:text-primary transition-colors inline-flex items-center gap-1 text-[12px]"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
