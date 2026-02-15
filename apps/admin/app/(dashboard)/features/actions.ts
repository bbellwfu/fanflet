"use server";

import { createServiceClient } from "@fanflet/db/service";
import { createClient } from "@fanflet/db/server";
import { revalidatePath } from "next/cache";

export async function toggleFeatureGlobal(flagId: string, isGlobal: boolean) {
  // Verify admin
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("feature_flags")
    .update({ is_global: isGlobal })
    .eq("id", flagId);

  if (error) {
    return { error: "Failed to update feature flag" };
  }

  revalidatePath("/features");
  return { success: true };
}
