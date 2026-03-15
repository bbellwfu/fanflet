/**
 * Impersonation uses a dedicated cookie name (fanflet_impersonation_auth) so we never
 * overwrite the standard Supabase auth cookie (sb-*-auth-token). That keeps the admin
 * app's session intact when the same browser has an impersonation tab open (avoids
 * localhost cookie clash and works in all environments without multiple domains).
 *
 * Security (why an attacker cannot "just set a cookie" to impersonate):
 * - The cookie value is a session payload whose access_token is a JWT signed with
 *   SUPABASE_JWT_SECRET (server-only, never exposed to the client).
 * - The JWT is validated by Supabase (GoTrue/PostgREST) on every request; forgery
 *   without the secret fails signature verification.
 * - Establish flow uses a one-time handoff token (DB-backed, short TTL); you cannot
 *   start impersonation without going through the admin start → establish flow.
 * - The cookie is httpOnly so XSS cannot read or exfiltrate it.
 */

const IMPERSONATION_AUTH_COOKIE = "fanflet_impersonation_auth";

export function getImpersonationAuthCookieName(): string {
  return IMPERSONATION_AUTH_COOKIE;
}

/** Chunked cookie suffix, e.g. .0, .1 */
export function getImpersonationAuthChunkName(i: number): string {
  return `${IMPERSONATION_AUTH_COOKIE}.${i}`;
}

/**
 * Returns cookies to pass to the Supabase client. When an impersonation session is
 * active (fanflet_impersonation_auth is set), we present it as the standard
 * sb-*-auth-token so the client sees a valid session without ever touching the
 * real Supabase cookie.
 */
export function getCookiesForSupabase(
  getAll: () => { name: string; value: string }[],
  supabaseAuthCookiePrefix: string
): { name: string; value: string }[] {
  const all = getAll();
  const hasImpersonation = all.some(
    (c) => c.name === IMPERSONATION_AUTH_COOKIE || c.name.startsWith(`${IMPERSONATION_AUTH_COOKIE}.`)
  );
  if (!hasImpersonation) return all;

  // Rebuild the full session from single or chunked impersonation cookie(s)
  let sessionPayload: string;
  const single = all.find((c) => c.name === IMPERSONATION_AUTH_COOKIE);
  if (single) {
    sessionPayload = single.value;
  } else {
    const chunks = all
      .filter((c) => c.name.startsWith(`${IMPERSONATION_AUTH_COOKIE}.`))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    sessionPayload = chunks.map((c) => c.value).join("");
  }

  // Return all cookies but replace sb-*-auth-token with our session so Supabase sees it
  const withoutSupabaseAuth = all.filter(
    (c) => !c.name.startsWith(supabaseAuthCookiePrefix)
  );
  return [
    ...withoutSupabaseAuth,
    { name: supabaseAuthCookiePrefix, value: sessionPayload },
  ];
}

export function getSupabaseAuthCookiePrefix(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "sb-auth-token";
  const projectRef = new URL(url).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}
