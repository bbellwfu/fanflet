import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import {
  generateHandoffToken,
  hashToken,
  IMPERSONATION_TTL_SECONDS,
  TOKEN_EXCHANGE_TTL_SECONDS,
} from "@fanflet/db/impersonation";
import { z } from "zod";

const RequestSchema = z.object({
  targetUserId: z.string().uuid(),
  targetRole: z.enum(["speaker", "sponsor"]),
  reason: z.string().optional(),
  writeEnabled: z.boolean().optional().default(false),
  returnPath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userSupabase = await createClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const appMetadata = user.app_metadata ?? {};
    if (appMetadata.role !== "platform_admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { targetUserId, targetRole, reason, writeEnabled, returnPath } = parsed.data;

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot impersonate yourself" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: targetUser, error: targetUserError } =
      await supabase.auth.admin.getUserById(targetUserId);
    if (targetUserError || !targetUser.user) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // No blanket admin block — impersonation targets the speaker/sponsor
    // profile on the web app, not admin-level access. The session is fully
    // audited and scoped to the requested role.

    if (targetRole === "speaker") {
      const { data: speaker } = await supabase
        .from("speakers")
        .select("id")
        .eq("auth_user_id", targetUserId)
        .single();
      if (!speaker) {
        return NextResponse.json(
          { error: "Target user has no speaker profile" },
          { status: 400 }
        );
      }
    } else {
      const { data: sponsor } = await supabase
        .from("sponsor_accounts")
        .select("id")
        .eq("auth_user_id", targetUserId)
        .single();
      if (!sponsor) {
        return NextResponse.json(
          { error: "Target user has no sponsor profile" },
          { status: 400 }
        );
      }
    }

    const expiresAt = new Date(
      Date.now() + IMPERSONATION_TTL_SECONDS * 1000
    );
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const userAgent = request.headers.get("user-agent");

    const { data: session, error: sessionError } = await supabase
      .from("impersonation_sessions")
      .insert({
        admin_id: user.id,
        target_user_id: targetUserId,
        target_role: targetRole,
        reason: reason || null,
        write_enabled: writeEnabled,
        expires_at: expiresAt.toISOString(),
        ip_address: ip || null,
        user_agent: userAgent || null,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to create impersonation session" },
        { status: 500 }
      );
    }

    const rawToken = generateHandoffToken();
    const tokenHash = await hashToken(rawToken);
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXCHANGE_TTL_SECONDS * 1000
    );

    const { error: tokenError } = await supabase
      .from("impersonation_tokens")
      .insert({
        token_hash: tokenHash,
        session_id: session.id,
        expires_at: tokenExpiresAt.toISOString(),
      });

    if (tokenError) {
      return NextResponse.json(
        { error: "Failed to create handoff token" },
        { status: 500 }
      );
    }

    await supabase.from("impersonation_actions").insert({
      session_id: session.id,
      action_type: "session_started",
      action_details: {
        admin_email: user.email,
        target_email: targetUser.user.email,
        target_role: targetRole,
        reason: reason || null,
        write_enabled: writeEnabled,
      },
    });

    const webUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const establishParams = new URLSearchParams({ token: rawToken });
    if (returnPath) {
      establishParams.set("returnPath", returnPath);
    }
    const establishUrl = `${webUrl}/api/impersonate/establish?${establishParams}`;

    return NextResponse.json({ redirectUrl: establishUrl });
  } catch (err) {
    console.error("Impersonation start error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
