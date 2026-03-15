import { NextResponse, type NextRequest } from "next/server";
import { getImpersonationSessionPayload } from "@/lib/impersonation-session";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ ready: false });
  }

  const result = await getImpersonationSessionPayload(sessionId);
  return NextResponse.json({ ready: result !== null });
}
