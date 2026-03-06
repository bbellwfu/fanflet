import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

const IMPERSONATION_TTL_SECONDS = 3600; // 1 hour
const TOKEN_EXCHANGE_TTL_SECONDS = 60; // 1 minute window to exchange handoff token

interface ImpersonationJWTPayload {
  targetUserId: string;
  adminId: string;
  sessionId: string;
  expiresAt: Date;
  targetAppMetadata: Record<string, unknown>;
  targetUserMetadata: Record<string, unknown>;
}

/**
 * Signs a custom JWT that makes auth.uid() return the target user's ID.
 * Uses the same HMAC-SHA256 secret that Supabase GoTrue uses, so all
 * existing RLS policies work without modification.
 */
export async function signImpersonationJWT(
  payload: ImpersonationJWTPayload
): Promise<string> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      "SUPABASE_JWT_SECRET is not set. Find it in Supabase Dashboard > Settings > API > JWT Secret."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.floor(payload.expiresAt.getTime() / 1000);

  const jwt = await new SignJWT({
    aud: "authenticated",
    role: "authenticated",
    iss: `${supabaseUrl}/auth/v1`,
    sub: payload.targetUserId,
    iat: now,
    exp,
    app_metadata: {
      ...payload.targetAppMetadata,
      impersonation: {
        admin_id: payload.adminId,
        session_id: payload.sessionId,
      },
    },
    user_metadata: payload.targetUserMetadata,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secret);

  return jwt;
}

/**
 * Hashes a raw token with SHA-256 for storage/lookup.
 * Only the hash is persisted; the raw token is transient.
 */
export async function hashToken(rawToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawToken);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a cryptographically random URL-safe token.
 */
export function generateHandoffToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Creates a service-role admin client for impersonation operations.
 * Separate from the main createServiceClient to keep impersonation
 * concerns isolated.
 */
function getAdminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role config for impersonation.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Fetches a user's profile by ID using the admin API.
 */
export async function getTargetUser(userId: string) {
  const supabase = getAdminAuthClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Error(`Target user not found: ${error?.message ?? "unknown"}`);
  }
  return data.user;
}

export { IMPERSONATION_TTL_SECONDS, TOKEN_EXCHANGE_TTL_SECONDS };
