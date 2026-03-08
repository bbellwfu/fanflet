import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { exportSpeakerAnalyticsCSV } from "@fanflet/core";
import type { DateRange } from "@fanflet/core";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    return NextResponse.json({ error: "Speaker not found" }, { status: 404 });
  }

  const entitlements = await getSpeakerEntitlements(speaker.id);

  const daysParam = request.nextUrl.searchParams.get("days");
  let range: DateRange | undefined;
  if (daysParam && daysParam !== "all") {
    const days = parseInt(daysParam, 10);
    if (!isNaN(days) && days > 0) {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      range = { from: from.toISOString(), to: to.toISOString() };
    }
  }

  const result = await exportSpeakerAnalyticsCSV(supabase, speaker.id, entitlements, range);
  if (result.error) {
    const status = result.error.code === "upgrade_required" ? 403 : 500;
    return NextResponse.json({ error: result.error.message }, { status });
  }

  return new NextResponse(result.data, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="fanflet-analytics.csv"`,
    },
  });
}
