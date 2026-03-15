import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@fanflet/db/service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 1. End expired sessions that were never ended
  const { data: endedRows } = await supabase
    .from("impersonation_sessions")
    .update({ ended_at: new Date().toISOString() })
    .is("ended_at", null)
    .lt("expires_at", new Date().toISOString())
    .select("id");

  // 2. Clear sensitive data from all ended sessions
  const { data: clearedRows } = await supabase
    .from("impersonation_sessions")
    .update({ session_payload: null, saved_auth_cookies: null })
    .not("ended_at", "is", null)
    .or("session_payload.not.is.null,saved_auth_cookies.not.is.null")
    .select("id");

  // 3. Delete sessions older than 90 days (keep audit trail for 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: deletedRows } = await supabase
    .from("impersonation_sessions")
    .delete()
    .lt("created_at", ninetyDaysAgo)
    .not("ended_at", "is", null)
    .select("id");

  return NextResponse.json({
    ended: endedRows?.length ?? 0,
    cleared: clearedRows?.length ?? 0,
    deleted: deletedRows?.length ?? 0,
    timestamp: new Date().toISOString(),
  });
}
