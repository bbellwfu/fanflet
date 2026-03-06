"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@fanflet/db/server";

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
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  // Clear any stale session before starting OAuth
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${adminUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  redirect(data.url);
}
