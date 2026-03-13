import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deck: string }> }
) {
  const { deck } = await params;

  // 1. Authenticate user as Admin
  try {
    await requireAdmin();
  } catch (error) {
    const url = new URL(request.url);
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", `/api/pitch/${deck}`);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Map deck param to file path
  const deckMap: Record<string, string> = {
    "speaker": "speaker/index.html",
    "sponsor": "sponsor/index.html",
    "master": "master/index.html"
  };

  const relativePath = deckMap[deck];
  if (!relativePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 3. Read the HTML file from secure storage
  // Storage is now at the root of the admin app
  const storagePath = path.join(process.cwd(), "pitch-storage", relativePath);
  
  if (!fs.existsSync(storagePath)) {
    console.error(`Pitch deck not found at: ${storagePath}`);
    return new NextResponse("Not Found", { status: 404 });
  }

  const html = fs.readFileSync(storagePath, "utf-8");

  // 4. Return as raw HTML response
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
