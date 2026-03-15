import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import {
  getCookiesForSupabase,
  getSupabaseAuthCookiePrefix,
} from "@/lib/impersonation-cookie";
import { getImpersonationSessionPayload } from "@/lib/impersonation-session";

const IMP_SESSION_HEADER = "x-impersonation-session-id";

export async function createClient() {
  const headersList = await headers();
  const impSessionId = headersList.get(IMP_SESSION_HEADER);

  if (impSessionId) {
    const result = await getImpersonationSessionPayload(impSessionId);
    if (result) {
      // Provide the impersonation session through the cookie adapter so the
      // Supabase SSR client uses the impersonation JWT for all PostgREST
      // queries (auth.uid() = target user). Using setSession() with empty
      // cookie handlers doesn't persist — the client re-reads from cookies.
      const supabasePrefix = getSupabaseAuthCookiePrefix();
      const sessionPayload = JSON.stringify(result.payload);
      const client = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => [{ name: supabasePrefix, value: sessionPayload }],
            setAll: () => {},
          },
        }
      );

      // Override getUser() — the custom-signed impersonation JWT is not a real
      // GoTrue session so getUser() may reject it. Return the user from the
      // DB-backed session payload instead (same approach as middleware).
      const payloadUser = result.payload.user;
      const originalAuth = client.auth;
      client.auth = Object.create(originalAuth);
      client.auth.getUser = async () => ({
        data: {
          user: {
            id: payloadUser.id,
            aud: payloadUser.aud ?? "authenticated",
            role: payloadUser.role ?? "authenticated",
            email: payloadUser.email ?? "",
            app_metadata: payloadUser.app_metadata ?? {},
            user_metadata: payloadUser.user_metadata ?? {},
            created_at: "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        error: null,
      });

      return client;
    }
  }

  const cookieStore = await cookies();
  const supabasePrefix = getSupabaseAuthCookiePrefix();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesForSupabase(
            () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
            supabasePrefix
          );
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
