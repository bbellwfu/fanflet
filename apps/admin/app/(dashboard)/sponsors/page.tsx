import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { BuildingIcon } from "lucide-react";
import { SponsorsFilterForm } from "./sponsors-filter-form";

interface SponsorWithCounts {
  id: string;
  company_name: string;
  slug: string;
  contact_email: string;
  industry: string | null;
  logo_url: string | null;
  is_verified: boolean;
  created_at: string;
  connection_count: number;
  lead_count: number;
}

export default async function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("sponsor_accounts")
    .select("id, company_name, slug, contact_email, industry, logo_url, is_verified, created_at")
    .order("created_at", { ascending: false });

  if (params.search) {
    query = query.or(
      `company_name.ilike.%${params.search}%,contact_email.ilike.%${params.search}%,slug.ilike.%${params.search}%`
    );
  }

  if (params.status === "verified") {
    query = query.eq("is_verified", true);
  } else if (params.status === "pending") {
    query = query.eq("is_verified", false);
  }

  const { data: sponsors, error } = await query;

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load sponsors: {error.message}
      </div>
    );
  }

  const sponsorsWithCounts: SponsorWithCounts[] = await Promise.all(
    (sponsors ?? []).map(async (sponsor) => {
      const [connectionResult, leadResult] = await Promise.all([
        supabase
          .from("sponsor_connections")
          .select("id", { count: "exact", head: true })
          .eq("sponsor_id", sponsor.id)
          .eq("status", "active"),
        supabase
          .from("sponsor_leads")
          .select("id", { count: "exact", head: true })
          .eq("sponsor_id", sponsor.id),
      ]);

      return {
        ...sponsor,
        connection_count: connectionResult.count ?? 0,
        lead_count: leadResult.count ?? 0,
      };
    })
  );

  const verifiedCount = (sponsors ?? []).filter((s) => s.is_verified).length;
  const pendingCount = (sponsors ?? []).filter((s) => !s.is_verified).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Sponsors
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Review and manage sponsor accounts.{" "}
          <span className="font-medium text-fg">{verifiedCount}</span> verified,{" "}
          <span className="font-medium text-fg">{pendingCount}</span> pending review.
        </p>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle p-5">
        <SponsorsFilterForm
          key={`${params.search ?? ""}-${params.status ?? "all"}`}
          defaultSearch={params.search ?? ""}
          defaultStatus={params.status ?? "all"}
        />
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
            <BuildingIcon className="w-4 h-4 text-primary-soft" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {sponsorsWithCounts.length} Sponsor
            {sponsorsWithCounts.length !== 1 ? "s" : ""}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Company
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Contact
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Industry
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-center text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Connections
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-center text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Leads
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sponsorsWithCounts.map((sponsor) => (
                <tr
                  key={sponsor.id}
                  className="hover:bg-surface-elevated/50 transition-colors min-h-[44px]"
                >
                  <td className="px-5 py-3.5 align-middle">
                    <Link
                      href={`/sponsors/${sponsor.id}`}
                      className="font-medium text-fg hover:text-primary transition-colors flex items-center gap-2 py-2 -my-2 whitespace-nowrap"
                    >
                      {sponsor.logo_url ? (
                        <img
                          src={sponsor.logo_url}
                          alt=""
                          className="w-6 h-6 rounded object-contain bg-surface-elevated shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-surface-elevated flex items-center justify-center shrink-0">
                          <BuildingIcon className="w-3 h-3 text-fg-muted" />
                        </div>
                      )}
                      {sponsor.company_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary whitespace-nowrap align-middle">
                    {sponsor.contact_email}
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-fg-secondary align-middle">
                    {sponsor.industry ?? "—"}
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-center text-fg align-middle">
                    {sponsor.connection_count}
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-center text-fg align-middle">
                    {sponsor.lead_count}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                    <VerificationBadge verified={sponsor.is_verified} />
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted align-middle">
                    {new Date(sponsor.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {sponsorsWithCounts.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No sponsors found
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

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
        verified
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      }`}
    >
      {verified ? "Verified" : "Pending"}
    </span>
  );
}
