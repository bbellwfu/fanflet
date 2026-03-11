"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { generateDemoContent } from "@fanflet/core/demo-ai";
import { seedDemoEnvironment } from "@fanflet/core/demo-seeder";
import { cleanupDemoEnvironment, convertDemoToReal } from "@fanflet/core/demo-cleanup";
import type { DemoProspectInput } from "@fanflet/core/demo-ai";
import { z } from "zod";

const createDemoSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  specialty: z.string().min(1, "Specialty is required"),
  credentials: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  photo_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  sponsors: z.string().optional(),
  theme: z.string().optional(),
});

export async function createDemoEnvironment(
  formData: FormData,
): Promise<{ id?: string; error?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = createDemoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "ANTHROPIC_API_KEY not configured" };
  }

  const supabase = createServiceClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Guard: check for duplicate (same name already provisioning or active)
  const { data: existing } = await supabase
    .from("demo_environments")
    .select("id, status")
    .eq("prospect_name", data.full_name)
    .in("status", ["provisioning", "active"])
    .maybeSingle();

  if (existing) {
    return {
      error:
        existing.status === "provisioning"
          ? "A demo for this prospect is already being generated. Please wait."
          : "An active demo already exists for this prospect.",
      id: existing.id,
    };
  }

  // Guard: daily creation limit (max 20 per day)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("demo_environments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", dayAgo);

  if ((recentCount ?? 0) >= 20) {
    return { error: "Daily demo creation limit reached (20/day)." };
  }

  // Parse sponsor names (comma-separated) into sponsor objects
  const sponsorList: DemoProspectInput["sponsors"] = data.sponsors
    ? data.sponsors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ company_name: name }))
    : undefined;

  const input: DemoProspectInput = {
    full_name: data.full_name,
    email: data.email || undefined,
    specialty: data.specialty,
    credentials: data.credentials || undefined,
    website_url: data.website_url || undefined,
    linkedin_url: data.linkedin_url || undefined,
    photo_url: data.photo_url || undefined,
    notes: data.notes || undefined,
    sponsors: sponsorList,
    theme: data.theme || undefined,
  };

  // Create the demo_environments row in 'provisioning' state
  const { data: demoRow, error: insertError } = await supabase
    .from("demo_environments")
    .insert({
      prospect_name: data.full_name,
      prospect_email: data.email || null,
      prospect_specialty: data.specialty,
      prospect_notes: data.notes || null,
      created_by: admin.user.id,
      expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: "provisioning",
      research_input: input as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insertError || !demoRow) {
    return { error: `Failed to create demo record: ${insertError?.message}` };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "demo.create",
    category: "account",
    targetType: "demo_environment",
    targetId: demoRow.id,
    details: { prospect_name: data.full_name, specialty: data.specialty },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  // Run provisioning inline — Vercel kills fire-and-forget promises after
  // the response is sent, so we must await here. The client polls for status
  // independently so the UX remains responsive.
  await provisionDemo(supabase, demoRow.id, input, apiKey, admin.user.id, siteUrl);

  return { id: demoRow.id };
}

async function provisionDemo(
  serviceClient: ReturnType<typeof createServiceClient>,
  demoId: string,
  input: DemoProspectInput,
  apiKey: string,
  adminUserId: string,
  siteUrl: string,
): Promise<void> {
  try {
    const payload = await generateDemoContent(input, apiKey);

    await serviceClient
      .from("demo_environments")
      .update({
        ai_generated_payload: payload as unknown as Record<string, unknown>,
      })
      .eq("id", demoId);

    await seedDemoEnvironment(
      serviceClient,
      demoId,
      input,
      payload,
      adminUserId,
      siteUrl,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown provisioning error";
    console.error(`[demo] Provisioning failed for ${demoId}:`, message);

    await serviceClient
      .from("demo_environments")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", demoId);
  }
}

export async function pollDemoStatus(
  id: string,
): Promise<{
  status: string;
  error_message?: string;
  speaker_id?: string;
  speaker_slug?: string;
  seed_manifest?: Record<string, unknown>;
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("demo_environments")
    .select("status, error_message, speaker_id, seed_manifest, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { status: "unknown" };
  }

  // Auto-fail demos stuck in provisioning for > 5 minutes
  if (data.status === "provisioning") {
    const createdAt = new Date(data.created_at as string).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - createdAt > fiveMinutes) {
      await supabase
        .from("demo_environments")
        .update({
          status: "failed",
          error_message: "Provisioning timed out after 5 minutes",
        })
        .eq("id", id)
        .eq("status", "provisioning");

      return {
        status: "failed",
        error_message: "Provisioning timed out after 5 minutes",
      };
    }
  }

  let speakerSlug: string | undefined;
  if (data.speaker_id) {
    const { data: speaker } = await supabase
      .from("speakers")
      .select("slug")
      .eq("id", data.speaker_id)
      .single();
    speakerSlug = speaker?.slug ?? undefined;
  }

  return {
    status: data.status,
    error_message: data.error_message ?? undefined,
    speaker_id: data.speaker_id ?? undefined,
    speaker_slug: speakerSlug,
    seed_manifest: data.seed_manifest as Record<string, unknown> | undefined,
  };
}

export async function retryDemoEnvironment(
  id: string,
): Promise<{ error?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "ANTHROPIC_API_KEY not configured" };
  }

  const supabase = createServiceClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: demo, error: fetchError } = await supabase
    .from("demo_environments")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !demo) {
    return { error: "Demo environment not found" };
  }

  if (demo.status !== "failed") {
    return { error: `Cannot retry a demo with status "${demo.status}"` };
  }

  const input = demo.research_input as DemoProspectInput | null;
  if (!input) {
    return { error: "No research input stored — cannot retry" };
  }

  // Reset the row to provisioning
  await supabase
    .from("demo_environments")
    .update({
      status: "provisioning",
      error_message: null,
      ai_generated_payload: null,
      seed_manifest: null,
      speaker_id: null,
      auth_user_id: null,
      sponsor_account_ids: [],
    })
    .eq("id", id);

  await auditAdminAction({
    adminId: admin.user.id,
    action: "demo.retry",
    category: "account",
    targetType: "demo_environment",
    targetId: id,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  await provisionDemo(supabase, id, input, apiKey, admin.user.id, siteUrl);

  revalidatePath(`/demos/${id}`);
  revalidatePath("/demos");
  return {};
}

export async function deleteDemoEnvironment(
  id: string,
): Promise<{ error?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();
  const result = await cleanupDemoEnvironment(supabase, id);

  if (!result.success) {
    return { error: result.error };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "demo.delete",
    category: "account",
    targetType: "demo_environment",
    targetId: id,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/demos");
  return {};
}

export async function convertDemo(
  demoId: string,
  realAuthUserId: string,
): Promise<{ error?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const parsed = z.string().uuid().safeParse(realAuthUserId);
  if (!parsed.success) {
    return { error: "Invalid auth user ID" };
  }

  const supabase = createServiceClient();
  const result = await convertDemoToReal(supabase, demoId, parsed.data);

  if (!result.success) {
    return { error: result.error };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "demo.convert",
    category: "account",
    targetType: "demo_environment",
    targetId: demoId,
    details: { real_auth_user_id: parsed.data },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/demos");
  revalidatePath("/accounts");
  return {};
}

export async function extendDemoTTL(
  id: string,
  days: number,
): Promise<{ error?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const { data: demo } = await supabase
    .from("demo_environments")
    .select("expires_at")
    .eq("id", id)
    .single();

  if (!demo) return { error: "Demo not found" };

  const currentExpiry = new Date(demo.expires_at as string);
  const newExpiry = new Date(
    currentExpiry.getTime() + days * 24 * 60 * 60 * 1000,
  );

  await supabase
    .from("demo_environments")
    .update({ expires_at: newExpiry.toISOString() })
    .eq("id", id);

  // Also update the speaker's TTL
  const { data: demoFull } = await supabase
    .from("demo_environments")
    .select("speaker_id")
    .eq("id", id)
    .single();

  if (demoFull?.speaker_id) {
    await supabase
      .from("speakers")
      .update({ demo_expires_at: newExpiry.toISOString() })
      .eq("id", demoFull.speaker_id);
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "demo.extend",
    category: "account",
    targetType: "demo_environment",
    targetId: id,
    details: { additional_days: days },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/demos/${id}`);
  revalidatePath("/demos");
  return {};
}
