"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { z } from "zod";

const toggleSponsorVerificationSchema = z.object({
  sponsorId: z.string().uuid(),
  currentlyVerified: z.boolean(),
});

export async function toggleSponsorVerification(
  sponsorId: string,
  currentlyVerified: boolean
) {
  const parsed = toggleSponsorVerificationSchema.safeParse({
    sponsorId,
    currentlyVerified,
  });
  if (!parsed.success) return { error: "Invalid input" };
  const { sponsorId: validSponsorId, currentlyVerified: validCurrentlyVerified } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("sponsor_accounts")
    .update({
      is_verified: !validCurrentlyVerified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validSponsorId);

  if (error) {
    return { error: "Failed to update verification status" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: validCurrentlyVerified
      ? "sponsor.unverify"
      : "sponsor.verify",
    category: "sponsor",
    targetType: "sponsor",
    targetId: validSponsorId,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/sponsors/${validSponsorId}`);
  revalidatePath("/sponsors");
  return { success: true };
}

const updateSponsorPlanSchema = z.object({
  sponsorId: z.string().uuid(),
  planId: z.string().uuid(),
});

export async function updateSponsorPlan(sponsorId: string, planId: string) {
  const parsed = updateSponsorPlanSchema.safeParse({ sponsorId, planId });
  if (!parsed.success) return { error: "Invalid input" };
  const { sponsorId: validSponsorId, planId: validPlanId } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: plan, error: planError } = await supabase
    .from("sponsor_plans")
    .select("id, limits")
    .eq("id", validPlanId)
    .single();

  if (planError || !plan) {
    return { error: "Plan not found" };
  }

  const limitsSnapshot = (plan.limits as Record<string, number>) ?? {};

  const { data: existing } = await supabase
    .from("sponsor_subscriptions")
    .select("id")
    .eq("sponsor_id", validSponsorId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { error: subError } = await supabase
      .from("sponsor_subscriptions")
      .update({
        plan_id: validPlanId,
        limits_snapshot: limitsSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (subError) return { error: subError.message };
  } else {
    const { error: insertError } = await supabase
      .from("sponsor_subscriptions")
      .insert({
        sponsor_id: validSponsorId,
        plan_id: validPlanId,
        status: "active",
        limits_snapshot: limitsSnapshot,
      });
    if (insertError) return { error: insertError.message };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "sponsor.plan_change",
    category: "sponsor",
    targetType: "sponsor",
    targetId: validSponsorId,
    details: { plan_id: validPlanId },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/sponsors/${validSponsorId}`);
  revalidatePath("/sponsors");
  return { success: true };
}

const updateSponsorProfileSchema = z.object({
  sponsorId: z.string().uuid(),
  company_name: z.string().min(1, "Company name is required").max(200),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  contact_email: z.string().email("Invalid email address"),
  industry: z.string().max(100).nullable(),
  website_url: z.string().url("Invalid URL").or(z.literal("")).nullable(),
  description: z.string().max(2000).nullable(),
  logo_url: z.string().url("Invalid URL").or(z.literal("")).nullable(),
  speaker_label: z.string().min(1, "Speaker label is required").max(50),
});

export async function updateSponsorProfile(
  sponsorId: string,
  data: {
    company_name: string;
    slug: string;
    contact_email: string;
    industry: string | null;
    website_url: string | null;
    description: string | null;
    logo_url: string | null;
    speaker_label: string;
  }
) {
  const parsed = updateSponsorProfileSchema.safeParse({ sponsorId, ...data });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }
  const { sponsorId: validId, ...fields } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  // Slug uniqueness check
  const { data: slugConflict } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("slug", fields.slug)
    .neq("id", validId)
    .maybeSingle();

  if (slugConflict) {
    return { error: "Slug is already taken by another sponsor." };
  }

  // Normalize empty strings to null for nullable fields
  const normalizedFields = {
    company_name: fields.company_name,
    slug: fields.slug,
    contact_email: fields.contact_email,
    industry: fields.industry || null,
    website_url: fields.website_url || null,
    description: fields.description || null,
    logo_url: fields.logo_url || null,
    speaker_label: fields.speaker_label,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("sponsor_accounts")
    .update(normalizedFields)
    .eq("id", validId);

  if (updateError) {
    return { error: "Failed to update sponsor profile." };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "sponsor.profile_update",
    category: "sponsor",
    targetType: "sponsor",
    targetId: validId,
    details: { fields_updated: Object.keys(fields) },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/sponsors/${validId}`);
  revalidatePath("/sponsors");
  return { success: true };
}
