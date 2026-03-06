"use server";

import { revalidatePath } from "next/cache";
import { requireSponsor } from "@/lib/auth-context";
import { blockImpersonationWrites, logImpersonationAction } from "@/lib/impersonation";

export async function updateSponsorProfile(formData: FormData) {
  await blockImpersonationWrites();
  const { sponsorId, supabase } = await requireSponsor();

  const companyName = (formData.get("company_name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const contactEmail = (formData.get("contact_email") as string)?.trim();
  const websiteUrl = (formData.get("website_url") as string)?.trim() || null;
  const industry = (formData.get("industry") as string)?.trim() || null;

  if (!companyName) {
    return { error: "Company name is required." };
  }
  if (!contactEmail) {
    return { error: "Contact email is required." };
  }

  if (slug) {
    const { data: existing } = await supabase
      .from("sponsor_accounts")
      .select("id")
      .eq("slug", slug)
      .neq("id", sponsorId)
      .maybeSingle();

    if (existing) {
      return { error: "This URL slug is already taken." };
    }
  }

  const { error } = await supabase
    .from("sponsor_accounts")
    .update({
      company_name: companyName,
      slug: slug || null,
      description,
      contact_email: contactEmail,
      website_url: websiteUrl,
      industry,
    })
    .eq("id", sponsorId);

  if (error) {
    if (error.code === "23505" && error.message?.includes("slug")) {
      return { error: "This URL slug is already taken. Please choose another." };
    }
    return { error: error.message };
  }
  await logImpersonationAction("mutation", "/sponsor/dashboard/settings", { action: "updateSponsorProfile", sponsorId });

  revalidatePath("/sponsor/settings");
  revalidatePath("/sponsor/dashboard");
  return { success: true };
}

export async function checkSponsorSlugAvailability(slug: string) {
  const { sponsorId, supabase } = await requireSponsor();

  if (!slug?.trim()) return { available: false };

  const { data: existing } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("slug", slug)
    .neq("id", sponsorId)
    .maybeSingle();

  return { available: !existing };
}

export async function updateSponsorLogo(logoUrl: string) {
  await blockImpersonationWrites();
  const { sponsorId, supabase } = await requireSponsor();

  const { error } = await supabase
    .from("sponsor_accounts")
    .update({ logo_url: logoUrl })
    .eq("id", sponsorId);

  if (error) return { error: error.message };
  await logImpersonationAction("mutation", "/sponsor/dashboard/settings", { action: "updateSponsorLogo", sponsorId });

  revalidatePath("/sponsor/settings");
  revalidatePath("/sponsor/dashboard");
  return { success: true };
}

export async function removeSponsorLogo() {
  await blockImpersonationWrites();
  const { sponsorId, supabase } = await requireSponsor();

  const { error } = await supabase
    .from("sponsor_accounts")
    .update({ logo_url: null })
    .eq("id", sponsorId);

  if (error) return { error: error.message };
  await logImpersonationAction("mutation", "/sponsor/dashboard/settings", { action: "removeSponsorLogo", sponsorId });

  revalidatePath("/sponsor/settings");
  revalidatePath("/sponsor/dashboard");
  return { success: true };
}
