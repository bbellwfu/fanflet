/**
 * Platform-wide magic link generation using Supabase admin.generateLink().
 * Supports passwordless sign-in (for demo prospects, invitations) and
 * password recovery (forgot password).
 *
 * Uses the service-role client — server-side only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MagicLinkResult {
  /** The full verification URL the user should visit. */
  verificationUrl: string;
  /** Hashed token embedded in the URL (for logging / debugging). */
  hashedToken: string;
}

export type PortalRole = "speaker" | "sponsor" | "admin";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ROLE_REDIRECT: Record<PortalRole, string> = {
  speaker: "/dashboard",
  sponsor: "/sponsor/dashboard",
  admin: "/",
};

function buildRedirectUrl(siteUrl: string, role: PortalRole): string {
  const destination = ROLE_REDIRECT[role];
  return `${siteUrl}/auth/confirm?next=${encodeURIComponent(destination)}`;
}

/* ------------------------------------------------------------------ */
/*  Magic link (passwordless sign-in)                                  */
/* ------------------------------------------------------------------ */

/**
 * Generate a one-time magic sign-in link for a user.
 * The link lands on /auth/confirm which verifies the OTP and redirects
 * to the correct portal based on the role param.
 */
export async function generateMagicLink(
  serviceClient: SupabaseClient,
  email: string,
  siteUrl: string,
  role: PortalRole = "speaker",
): Promise<MagicLinkResult> {
  const redirectTo = buildRedirectUrl(siteUrl, role);

  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties) {
    throw new Error(
      `Failed to generate magic link: ${error?.message ?? "no data returned"}`,
    );
  }

  // Supabase stores magic link tokens for existing confirmed users as
  // "recovery_token" internally. Parse the actual verification type from
  // Supabase's generated action_link so verifyOtp matches the stored type.
  const actionLink = data.properties.action_link ?? "";
  let verifyType = "magiclink";
  try {
    const parsed = new URL(actionLink);
    const actionType = parsed.searchParams.get("type");
    if (actionType) verifyType = actionType;
  } catch {
    // action_link may be empty or malformed — fall back to "magiclink"
  }

  return {
    verificationUrl: buildVerificationUrl(
      siteUrl,
      data.properties.hashed_token,
      verifyType,
      ROLE_REDIRECT[role],
    ),
    hashedToken: data.properties.hashed_token,
  };
}

/* ------------------------------------------------------------------ */
/*  Password recovery link                                             */
/* ------------------------------------------------------------------ */

/**
 * Generate a password-recovery link. After the user clicks it, they
 * land on /auth/confirm which verifies the OTP and redirects to
 * /login/reset-password where they can set a new password.
 */
export async function generatePasswordResetLink(
  serviceClient: SupabaseClient,
  email: string,
  siteUrl: string,
): Promise<MagicLinkResult> {
  const redirectTo = `${siteUrl}/auth/confirm?next=${encodeURIComponent("/login/reset-password")}`;

  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties) {
    throw new Error(
      `Failed to generate recovery link: ${error?.message ?? "no data returned"}`,
    );
  }

  return {
    verificationUrl: buildVerificationUrl(
      siteUrl,
      data.properties.hashed_token,
      "recovery",
      "/login/reset-password",
    ),
    hashedToken: data.properties.hashed_token,
  };
}

/* ------------------------------------------------------------------ */
/*  Build verification URL                                             */
/* ------------------------------------------------------------------ */

/**
 * Supabase admin.generateLink returns the hashed_token but we build
 * the verification URL ourselves so we can control the host and path.
 */
function buildVerificationUrl(
  siteUrl: string,
  hashedToken: string,
  type: string,
  next: string,
): string {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type,
    next,
  });
  return `${siteUrl}/auth/confirm?${params.toString()}`;
}
