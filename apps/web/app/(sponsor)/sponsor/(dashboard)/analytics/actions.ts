"use server";

import { createClient } from "@/lib/supabase/server";
import { loadSponsorEntitlements } from "@fanflet/db";
import { exportSponsorAnalyticsCSV } from "@fanflet/core";

export async function downloadSponsorAnalyticsAction(
  fanfletIds: string[],
  blockIds: string[],
  range?: string,
  from?: string,
  to?: string,
  type: "aggregated" | "raw" = "raw"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) throw new Error("Sponsor not found");

  const entitlements = await loadSponsorEntitlements(supabase, sponsor.id);
  const retentionDays = entitlements.limits.analytics_retention_days;
  const hasRetentionLimit = typeof retentionDays === "number" && retentionDays > 0;
  const earliestAllowed = hasRetentionLimit
    ? new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    : null;

  let dateRange;
  if (range === "custom" && from) {
    const fromDate = new Date(from);
    const toDate = to ? new Date(to) : new Date();
    if (to && !to.includes("T")) {
      toDate.setHours(23, 59, 59, 999);
    }
    if (earliestAllowed && fromDate < earliestAllowed) {
      fromDate.setTime(earliestAllowed.getTime());
    }
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  } else if (range && range !== "all") {
    const days = parseInt(range, 10);
    const clampedDays = hasRetentionLimit ? Math.min(days, retentionDays) : days;
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - clampedDays * 24 * 60 * 60 * 1000);
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  } else if (range === "all" && earliestAllowed) {
    dateRange = { from: earliestAllowed.toISOString(), to: new Date().toISOString() };
  }

  const result = await exportSponsorAnalyticsCSV(
    supabase,
    sponsor.id,
    fanfletIds,
    blockIds,
    dateRange,
    type
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
