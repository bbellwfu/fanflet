"use server";

import { createClient } from "@/lib/supabase/server";
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

  let dateRange;
  if (range === "custom" && from) {
    const fromDate = new Date(from);
    const toDate = to ? new Date(to) : new Date();
    if (to && !to.includes("T")) {
      toDate.setHours(23, 59, 59, 999);
    }
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  } else if (range && range !== "all") {
    const days = parseInt(range, 10);
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
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
