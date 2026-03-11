import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@fanflet/db/service";
import { rateLimit } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/admin-notifications";
import { renderSponsorInquiryConfirmation } from "@fanflet/core/sponsor-inquiry-email";
import { Resend } from "resend";

const InquirySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email")
    .max(320, "Email is too long"),
  details: z
    .string()
    .min(1, "Please describe your sponsorship goals")
    .max(5000, "Message is too long"),
  captchaToken: z.string().optional(),
});

async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      response: token,
      ...(remoteip && { remoteip }),
    }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return null;
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM ?? "Fanflet <onboarding@resend.dev>";
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, "sponsor-inquiry", 5, 60_000);
  if (rl.limited) return rl.response!;

  try {
    const body = await request.json();
    const parsed = InquirySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { name, email, details, captchaToken } = parsed.data;

    if (process.env.TURNSTILE_SECRET_KEY && !captchaToken) {
      return NextResponse.json(
        { error: "Security check is required. Please try again." },
        { status: 400 }
      );
    }

    if (captchaToken) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        undefined;
      const valid = await verifyTurnstile(captchaToken, ip);
      if (!valid) {
        return NextResponse.json(
          { error: "Security check failed. Please try again." },
          { status: 400 }
        );
      }
    }

    const supabase = createServiceClient();
    const row = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      details: details.trim(),
    };

    // Prefer sponsor_inquiries (after rename migration); fallback to enterprise_inquiries if rename not applied
    let data: { id: string } | null = null;
    let error: { code: string; message: string; details?: unknown } | null = null;

    const res = await supabase
      .from("sponsor_inquiries")
      .insert(row)
      .select("id")
      .single();
    data = res.data;
    error = res.error;

    if (error?.code === "42P01") {
      // relation "sponsor_inquiries" does not exist — use legacy table name
      const fallback = await supabase
        .from("enterprise_inquiries")
        .insert(row)
        .select("id")
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error(
        "[sponsor-inquiry] Supabase error:",
        error.code,
        error.message,
        error.details
      );
      return NextResponse.json(
        { error: "Something went wrong. Please try again later." },
        { status: 500 }
      );
    }

    const inserted = data;

    const inquiryId = inserted?.id;
    if (inquiryId) {
      after(async () => {
        await notifyAdmins("sponsor_inquiry", {
          inquiryId,
          name: name.trim(),
          email: email.trim(),
          details: details.trim(),
        });

        const resend = getResendClient();
        if (resend) {
          const html = renderSponsorInquiryConfirmation(name.trim());
          await resend.emails.send({
            from: getFromAddress(),
            to: email.trim(),
            subject: "We received your inquiry — Fanflet",
            html,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Thanks! We'll be in touch soon.",
    });
  } catch (err) {
    console.error("[sponsor-inquiry] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
