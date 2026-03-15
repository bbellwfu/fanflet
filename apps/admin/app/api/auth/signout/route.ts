import { createClient } from "@fanflet/db/server";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

/** Safe redirect: only allow same-origin path (no open redirect). Returns full URL. */
function safeRedirectUrl(next: string | null): string {
  if (!next || typeof next !== "string") return new URL("/login", ADMIN_ORIGIN).toString();
  try {
    const u = new URL(next, ADMIN_ORIGIN);
    if (u.origin !== new URL(ADMIN_ORIGIN).origin) return new URL("/login", ADMIN_ORIGIN).toString();
    return u.toString();
  } catch {
    return new URL("/login", ADMIN_ORIGIN).toString();
  }
}

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const supabase = await createClient();
  await supabase.auth.signOut();
  const target = safeRedirectUrl(next);
  return NextResponse.redirect(target, { status: 302 });
}

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", ADMIN_ORIGIN), { status: 302 });
}
