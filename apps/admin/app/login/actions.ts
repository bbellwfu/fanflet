"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@fanflet/db/server";

function getAdminUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  return url.replace(/\/$/, "");
}

/** Redirect to admin MCP callback with state only; never use client-provided callback URL. */
function getAdminMcpCallbackRedirect(mcpState: string): string {
  return `${getAdminUrl()}/api/mcp/callback?state=${encodeURIComponent(mcpState)}`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Clear any stale session before signing in
  await supabase.auth.signOut();

  const mcpState = formData.get("mcp_state") as string | null;

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) {
    return { error: error.message };
  }

  if (mcpState && typeof mcpState === "string" && mcpState.trim()) {
    revalidatePath("/", "layout");
    redirect(getAdminMcpCallbackRedirect(mcpState.trim()));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle(opts?: { mcp_state?: string }) {
  const supabase = await createClient();
  const adminUrl = getAdminUrl();

  // Clear any stale session before starting OAuth
  await supabase.auth.signOut();

  const callbackUrl =
    opts?.mcp_state && typeof opts.mcp_state === "string" && opts.mcp_state.trim()
      ? `${adminUrl}/auth/callback?next=${encodeURIComponent(
          `/api/mcp/callback?state=${encodeURIComponent(opts.mcp_state.trim())}`
        )}`
      : `${adminUrl}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }
  redirect(data.url);
}
