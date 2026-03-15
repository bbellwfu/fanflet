"use server";

import { requireSponsor } from "@/lib/auth-context";
import { loadSponsorEntitlements } from "@fanflet/db";

export async function exportAuditLogCsv(): Promise<{ csv?: string; error?: string }> {
  const { supabase, sponsorId } = await requireSponsor();

  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_audit_log")) {
    return { error: "Audit log requires Sponsor Studio." };
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data, error } = await supabase
    .from("sponsor_audit_log")
    .select("action, category, target_type, target_id, details, created_at")
    .eq("sponsor_id", sponsorId)
    .gte("created_at", twelveMonthsAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) return { error: error.message };

  const rows = data ?? [];
  const header = "Date,Action,Category,Target Type,Target ID,Details";
  const csvRows = rows.map((r) => {
    const date = new Date(r.created_at).toISOString();
    const details = r.details ? JSON.stringify(r.details).replace(/"/g, '""') : "";
    return `${date},"${r.action}","${r.category}","${r.target_type ?? ""}","${r.target_id ?? ""}","${details}"`;
  });

  return { csv: [header, ...csvRows].join("\n") };
}
