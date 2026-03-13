"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { generateDemoContent, generateSponsorDemoContent, logAiUsage } from "@fanflet/core";
import { seedDemoEnvironment, seedSponsorDemoEnvironment } from "@fanflet/core/demo-seeder";
import { cleanupDemoEnvironment, convertDemoToReal } from "@fanflet/core/demo-cleanup";
import { generateMagicLink } from "@fanflet/core/magic-link";
import { buildDemoSignInEmail } from "@fanflet/core/magic-link-email";
import type { DemoProspectInput, SponsorDemoProspectInput, AiUsageData } from "@fanflet/core";
import { z } from "zod";

const createSpeakerDemoSchema = z.object({
  demo_type: z.literal("speaker"),
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

const createSponsorDemoSchema = z.object({
  demo_type: z.literal("sponsor"),
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  website_url: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

const createDemoSchema = z.discriminatedUnion("demo_type", [
  createSpeakerDemoSchema,
  createSponsorDemoSchema,
]);

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
  
  // Normalize URLs (assume https:// if protocol is missing)
  const urlFields = ["website_url", "linkedin_url", "photo_url", "logo_url"];
  for (const field of urlFields) {
    const val = raw[field];
    if (typeof val === "string" && val.trim() !== "") {
      const trimmed = val.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        raw[field] = `https://${trimmed}`;
      }
    }
  }

  const demoType = (raw.demo_type as string) || "speaker";
  raw.demo_type = demoType;

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

  const prospectName =
    data.demo_type === "speaker" ? data.full_name : data.company_name;

  // Guard: check for duplicate (same name already provisioning or active)
  const { data: existing } = await supabase
    .from("demo_environments")
    .select("id, status")
    .eq("prospect_name", prospectName)
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

  // Build input based on demo type
  const researchInput =
    data.demo_type === "speaker"
      ? buildSpeakerInput(data)
      : buildSponsorInput(data);

  const prospectEmail =
    data.demo_type === "speaker" ? data.email : data.contact_email;

  // Create the demo_environments row in 'provisioning' state
  const { data: demoRow, error: insertError } = await supabase
    .from("demo_environments")
    .insert({
      prospect_name: prospectName,
      prospect_email: prospectEmail || null,
      prospect_specialty:
        data.demo_type === "speaker" ? data.specialty : data.industry || null,
      prospect_notes: data.notes || null,
      demo_type: data.demo_type,
      created_by: admin.user.id,
      expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: "provisioning",
      research_input: researchInput as unknown as Record<string, unknown>,
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
    details: {
      prospect_name: prospectName,
      demo_type: data.demo_type,
      ...(data.demo_type === "speaker"
        ? { specialty: data.specialty }
        : { industry: data.industry }),
    },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  // Run provisioning inline — Vercel kills fire-and-forget promises
  if (data.demo_type === "speaker") {
    await provisionSpeakerDemo(
      supabase,
      demoRow.id,
      researchInput as DemoProspectInput,
      apiKey,
      admin.user.id,
      siteUrl,
    );
  } else {
    await provisionSponsorDemo(
      supabase,
      demoRow.id,
      researchInput as SponsorDemoProspectInput,
      apiKey,
      admin.user.id,
      siteUrl,
    );
  }

  return { id: demoRow.id };
}

function buildSpeakerInput(
  data: z.infer<typeof createSpeakerDemoSchema>,
): DemoProspectInput {
  const sponsorList: DemoProspectInput["sponsors"] = data.sponsors
    ? data.sponsors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ company_name: name }))
    : undefined;

  return {
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
}

function buildSponsorInput(
  data: z.infer<typeof createSponsorDemoSchema>,
): SponsorDemoProspectInput {
  return {
    company_name: data.company_name,
    contact_name: data.contact_name || undefined,
    contact_email: data.contact_email || undefined,
    website_url: data.website_url || undefined,
    industry: data.industry || undefined,
    logo_url: data.logo_url || undefined,
    notes: data.notes || undefined,
  };
}

async function provisionSpeakerDemo(
  serviceClient: ReturnType<typeof createServiceClient>,
  demoId: string,
  input: DemoProspectInput,
  apiKey: string,
  adminUserId: string,
  siteUrl: string,
): Promise<void> {
  try {
    const { data: payload, usage } = await generateDemoContent(input, apiKey);

    // Log AI usage
    await logAiUsage(serviceClient, {
      admin_id: adminUserId,
      feature_name: "demo_generation_speaker",
      ...usage,
      status: "success",
      context: { demo_id: demoId, prospect_name: input.full_name },
    });

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
    console.error(`[demo] Speaker provisioning failed for ${demoId}:`, message);

    // Log AI error
    await logAiUsage(serviceClient, {
      admin_id: adminUserId,
      feature_name: "demo_generation_speaker",
      model: "claude-haiku-4-5",
      status: "error",
      error_message: message,
      context: { demo_id: demoId, prospect_name: input.full_name },
    });

    await serviceClient
      .from("demo_environments")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", demoId);
  }
}

async function provisionSponsorDemo(
  serviceClient: ReturnType<typeof createServiceClient>,
  demoId: string,
  input: SponsorDemoProspectInput,
  apiKey: string,
  adminUserId: string,
  siteUrl: string,
): Promise<void> {
  try {
    const { data: payload, usage } = await generateSponsorDemoContent(input, apiKey);

    // Log AI usage
    await logAiUsage(serviceClient, {
      admin_id: adminUserId,
      feature_name: "demo_generation_sponsor",
      ...usage,
      status: "success",
      context: { demo_id: demoId, company_name: input.company_name },
    });

    await serviceClient
      .from("demo_environments")
      .update({
        ai_generated_payload: payload as unknown as Record<string, unknown>,
      })
      .eq("id", demoId);

    await seedSponsorDemoEnvironment(
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
    console.error(`[demo] Sponsor provisioning failed for ${demoId}:`, message);

    // Log AI error
    await logAiUsage(serviceClient, {
      admin_id: adminUserId,
      feature_name: "demo_generation_sponsor",
      model: "claude-haiku-4-5",
      status: "error",
      error_message: message,
      context: { demo_id: demoId, company_name: input.company_name },
    });

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

  const demoType = (demo.demo_type as string) || "speaker";
  const researchInput = demo.research_input as Record<string, unknown> | null;
  if (!researchInput) {
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
      sponsor_id: null,
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

  if (demoType === "sponsor") {
    await provisionSponsorDemo(
      supabase,
      id,
      researchInput as unknown as SponsorDemoProspectInput,
      apiKey,
      admin.user.id,
      siteUrl,
    );
  } else {
    await provisionSpeakerDemo(
      supabase,
      id,
      researchInput as unknown as DemoProspectInput,
      apiKey,
      admin.user.id,
      siteUrl,
    );
  }

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

export async function sendDemoMagicLink(
  demoId: string,
): Promise<{ error?: string; success?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: demo } = await supabase
    .from("demo_environments")
    .select("prospect_email, prospect_name, demo_type, auth_user_id, status, seed_manifest")
    .eq("id", demoId)
    .single();

  if (!demo) return { error: "Demo not found" };
  if (demo.status !== "active") return { error: "Demo must be active to send a magic link" };
  if (!demo.prospect_email) return { error: "No prospect email on file" };

  const demoType = (demo.demo_type as string) || "speaker";
  const portalRole = demoType === "sponsor" ? "sponsor" as const : "speaker" as const;

  // For sponsor demos, find the sponsor auth user; for speaker demos, use the main auth_user_id
  let authEmail: string | undefined;

  if (demoType === "sponsor") {
    const manifest = demo.seed_manifest as Record<string, unknown> | null;
    const sponsorAuthUserId = manifest?.sponsor_auth_user_id as string | null;
    if (sponsorAuthUserId) {
      const { data: authData } = await supabase.auth.admin.getUserById(sponsorAuthUserId);
      authEmail = authData?.user?.email ?? undefined;
    }
  } else {
    const authUserId = demo.auth_user_id as string | null;
    if (authUserId) {
      const { data: authData } = await supabase.auth.admin.getUserById(authUserId);
      authEmail = authData?.user?.email ?? undefined;
    }
  }

  if (!authEmail) return { error: "Could not resolve demo auth email" };

  const result = await generateMagicLink(
    supabase,
    authEmail,
    siteUrl,
    portalRole,
  );

  const { getEmailProvider } = await import("@/lib/email-provider");
  const emailHtml = buildDemoSignInEmail(
    result.verificationUrl,
    portalRole,
    demo.prospect_name as string,
  );

  const provider = getEmailProvider();
  const [sendResult] = await provider.send([
    {
      to: demo.prospect_email as string,
      subject: `Your Fanflet ${demoType === "sponsor" ? "Sponsor Portal" : "Speaker Dashboard"} demo is ready`,
      bodyHtml: emailHtml,
      replyTo: "support@fanflet.com",
    },
  ]);

  if (!sendResult.success) {
    return { error: "Failed to send magic link email" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "demo.send_magic_link",
    category: "account",
    targetType: "demo_environment",
    targetId: demoId,
    details: { prospect_email: demo.prospect_email, portal_role: portalRole },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  return { success: `Magic link sent to ${demo.prospect_email}` };
}
