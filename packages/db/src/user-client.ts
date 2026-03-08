import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client authenticated as a specific user.
 * RLS policies apply exactly as if the user were making the request from
 * the dashboard — auth.uid() returns the given userId.
 *
 * Use cases: MCP server, background jobs, integration adapters — any context
 * where we don't have a browser cookie but need user-scoped database access.
 *
 * Requires SUPABASE_JWT_SECRET (find in Supabase Dashboard > Settings > API).
 * This must be a server-only env var — never expose via NEXT_PUBLIC_.
 */
export async function createUserScopedClient(userId: string) {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      "SUPABASE_JWT_SECRET is not set. Required for user-scoped clients. " +
        "Find it in Supabase Dashboard > Settings > API > JWT Secret."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    aud: "authenticated",
    role: "authenticated",
    iss: `${supabaseUrl}/auth/v1`,
    sub: userId,
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secret);

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
