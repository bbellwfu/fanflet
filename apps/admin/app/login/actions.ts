"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { getSiteUrl } from "@fanflet/db/config";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Clear any stale session before signing in
  await supabase.auth.signOut();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  // Clear any stale session before starting OAuth
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  redirect(data.url);
}
