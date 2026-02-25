import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SubscribeSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  interest_tier: z.enum(["pro", "enterprise"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SubscribeSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, interest_tier } = parsed.data;
    const supabase = await createClient();

    const emailTrimmed = email.toLowerCase().trim();
    const row: { email: string; source: string; interest_tier?: string } = {
      email: emailTrimmed,
      source: "pricing_page",
    };
    if (interest_tier) row.interest_tier = interest_tier;

    const { error } = await supabase.from("marketing_subscribers").insert(row);

    if (error) {
      // Unique violation = already subscribed; optionally update interest_tier if they sent one
      if (error.code === "23505") {
        if (interest_tier) {
          await supabase
            .from("marketing_subscribers")
            .update({ interest_tier })
            .eq("email", emailTrimmed);
        }
        return NextResponse.json({ success: true, message: "You're on the list." }, { status: 200 });
      }
      // Log for debugging (server/Vercel logs only; never exposed to client)
      console.error("[subscribe] Supabase error:", error.code, error.message);
      return NextResponse.json(
        { error: "Something went wrong. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "You're on the list." }, { status: 200 });
  } catch (err) {
    console.error("[subscribe] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
