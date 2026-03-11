import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDate } from "@fanflet/db/timezone";
import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";

type SponsorInquiry = {
  id: string;
  name: string;
  email: string;
  details: string;
  status: string;
  created_at: string;
};

export default async function SponsorInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const { data: adminPrefs } = await supabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user!.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  let query = supabase
    .from("sponsor_inquiries")
    .select("id, name, email, details, status, created_at")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: inquiries, error } = await query;

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load sponsor inquiries: {error.message}
      </div>
    );
  }

  const rows = (inquiries ?? []) as SponsorInquiry[];
  const newCount = rows.filter((r) => r.status === "new").length;
  const contactedCount = rows.filter((r) => r.status === "contacted").length;
  const closedCount = rows.filter((r) => r.status === "closed").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Sponsor Inquiries
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Inbound requests from the pricing page &quot;For Sponsors&quot; CTA. Triage and follow up here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/sponsor-inquiries"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            (params.status ?? "all") === "all"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          All
        </Link>
        <Link
          href="/sponsor-inquiries?status=new"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.status === "new"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          New
        </Link>
        <Link
          href="/sponsor-inquiries?status=contacted"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.status === "contacted"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          Contacted
        </Link>
        <Link
          href="/sponsor-inquiries?status=closed"
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            params.status === "closed"
              ? "bg-primary text-primary-fg"
              : "bg-surface-elevated text-fg-secondary hover:bg-surface-hover"
          }`}
        >
          Closed
        </Link>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
            <MessageSquareIcon className="w-4 h-4 text-primary-soft" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {rows.length} {rows.length === 1 ? "inquiry" : "inquiries"}
            {(params.status ?? "all") === "all" && (
              <span className="text-fg-muted font-normal ml-1.5">
                (New: {newCount}, Contacted: {contactedCount}, Closed: {closedCount})
              </span>
            )}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Details
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-elevated/50 transition-colors min-h-[44px]"
                >
                  <td className="px-5 py-3.5 text-fg whitespace-nowrap align-middle">
                    <Link
                      href={`/sponsor-inquiries/${row.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary align-middle">
                    <a
                      href={`mailto:${row.email}`}
                      className="text-primary hover:underline"
                    >
                      {row.email}
                    </a>
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary align-middle max-w-[280px] truncate">
                    {row.details}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        row.status === "new"
                          ? "bg-amber-100 text-amber-800"
                          : row.status === "contacted"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted align-middle">
                    {formatDate(row.created_at, adminTimezone)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No inquiries yet
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
