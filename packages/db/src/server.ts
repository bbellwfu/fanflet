import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

const IMP_SESSION_HEADER = "x-impersonation-session-id";

/**
 * Derives the Supabase auth cookie prefix from the project URL.
 * e.g. "sb-eoihlmxmbtzsixoapgif-auth-token"
 */
function getSupabaseAuthCookiePrefix(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "sb-auth-token";
  const projectRef = new URL(url).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

/**
 * Loads the impersonation session payload from the DB by session ID.
 * Returns the JSON session payload or null if not found/expired/ended.
 */
async function getImpersonationPayload(
  sessionId: string
): Promise<string | null> {
  // Inline the service client creation to avoid circular imports
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const { createClient: createSupa } = await import("@supabase/supabase-js");
  const svc = createSupa(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await svc
    .from("impersonation_sessions")
    .select("session_payload, expires_at, ended_at")
    .eq("id", sessionId)
    .single();

  if (error || !data) return null;
  if (data.ended_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  if (!data.session_payload) return null;

  return JSON.stringify(data.session_payload);
}

export async function createClient() {
  // Check for impersonation session (set by middleware via request headers)
  const headersList = await headers();
  const impSessionId = headersList.get(IMP_SESSION_HEADER);

  if (impSessionId) {
    const sessionPayload = await getImpersonationPayload(impSessionId);
    if (sessionPayload) {
      const supabasePrefix = getSupabaseAuthCookiePrefix();
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => [{ name: supabasePrefix, value: sessionPayload }],
            setAll: () => {},
          },
        }
      );
    }
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
