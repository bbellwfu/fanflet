"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { SPEAKER_ERASURE_STEPS, executeStep } from "@/lib/deletion-pipeline";
import { z } from "zod";

const requestIdSchema = z.string().uuid();
const stepIdSchema = z.string().uuid();

const createRequestSchema = z.object({
  subjectEmail: z.string().email(),
  subjectType: z.enum(["speaker", "sponsor", "audience"]),
  requestType: z.enum(["erasure", "export", "access", "rectification", "restriction", "objection"]),
  source: z.enum(["user_self_service", "admin_initiated", "email_request", "legal_request"]),
  sourceReference: z.string().max(2000).optional(),
  regulation: z.enum(["gdpr", "ccpa", "pipeda", "lgpd", "other"]).optional(),
});

export interface DSRListFilters {
  status?: string;
  subjectType?: string;
  source?: string;
  search?: string;
}

export async function listDeletionRequests(filters: DSRListFilters = {}) {
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();
  let query = supabase
    .from("data_subject_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.subjectType) {
    query = query.eq("subject_type", filters.subjectType);
  }
  if (filters.source) {
    query = query.eq("source", filters.source);
  }
  if (filters.search) {
    query = query.or(
      `subject_email.ilike.%${filters.search}%,subject_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.limit(200);
  if (error) return { error: error.message };
  void admin;
  return { data: data ?? [] };
}

export async function getDeletionRequest(requestId: string) {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { error: "Invalid request ID" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const [requestResult, stepsResult] = await Promise.all([
    supabase
      .from("data_subject_requests")
      .select("*")
      .eq("id", parsed.data)
      .single(),
    supabase
      .from("data_subject_request_steps")
      .select("*")
      .eq("request_id", parsed.data)
      .order("step_order", { ascending: true }),
  ]);

  if (requestResult.error) return { error: requestResult.error.message };
  void admin;

  return {
    data: {
      request: requestResult.data,
      steps: stepsResult.data ?? [],
    },
  };
}

export async function createDeletionRequest(input: z.infer<typeof createRequestSchema>) {
  const parsed = createRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const { subjectEmail, subjectType, requestType, source, sourceReference, regulation } = parsed.data;

  let subjectAuthUserId: string | null = null;
  let subjectName: string | null = null;

  if (subjectType === "speaker") {
    const { data: authUser } = await supabase
      .from("speakers")
      .select("auth_user_id, name")
      .eq("email", subjectEmail)
      .is("deleted_at", null)
      .maybeSingle();
    subjectAuthUserId = (authUser?.auth_user_id as string) ?? null;
    subjectName = authUser?.name ?? null;
  } else if (subjectType === "sponsor") {
    const { data: sponsor } = await supabase
      .from("sponsor_accounts")
      .select("auth_user_id, company_name")
      .eq("email", subjectEmail)
      .is("deleted_at", null)
      .maybeSingle();
    subjectAuthUserId = (sponsor?.auth_user_id as string) ?? null;
    subjectName = sponsor?.company_name ?? null;
  }

  let regulatoryDeadline: string | null = null;
  if (regulation) {
    const deadlineDays: Record<string, number> = {
      lgpd: 15,
      gdpr: 30,
      pipeda: 30,
      ccpa: 45,
      other: 30,
    };
    const days = deadlineDays[regulation] ?? 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    regulatoryDeadline = deadline.toISOString();
  }

  const { data: request, error } = await supabase
    .from("data_subject_requests")
    .insert({
      subject_auth_user_id: subjectAuthUserId,
      subject_email: subjectEmail,
      subject_type: subjectType,
      subject_name: subjectName,
      request_type: requestType,
      source,
      source_reference: sourceReference ?? null,
      regulation: regulation ?? null,
      regulatory_deadline: regulatoryDeadline,
      status: "pending",
      created_by: admin.user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (requestType === "erasure" && subjectType === "speaker") {
    await supabase
      .from("speakers")
      .update({ status: "pending_delete" })
      .eq("email", subjectEmail)
      .is("deleted_at", null);
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "compliance.request_created",
    category: "compliance",
    targetType: "data_subject_request",
    targetId: request.id,
    details: { subjectEmail, subjectType, requestType, source, regulation },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/compliance");
  revalidatePath("/accounts");
  return { data: { id: request.id } };
}

export async function batchCreateDeletionRequests(emails: string[]) {
  const validEmails = emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => z.string().email().safeParse(e).success);

  if (validEmails.length === 0) return { error: "No valid emails provided" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const results: { email: string; requestId?: string; error?: string }[] = [];

  for (const email of validEmails) {
    const result = await createDeletionRequest({
      subjectEmail: email,
      subjectType: "speaker",
      requestType: "erasure",
      source: "admin_initiated",
      sourceReference: "Batch cleanup",
    });

    if (result.error) {
      results.push({ email, error: result.error });
    } else {
      results.push({ email, requestId: result.data?.id });
    }
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "compliance.batch_created",
    category: "compliance",
    details: {
      total: validEmails.length,
      succeeded: results.filter((r) => r.requestId).length,
      failed: results.filter((r) => r.error).length,
    },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/compliance");
  return { data: results };
}

export async function approveDeletionRequest(requestId: string) {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { error: "Invalid request ID" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: request, error: fetchError } = await supabase
    .from("data_subject_requests")
    .select("id, status, subject_type")
    .eq("id", parsed.data)
    .single();

  if (fetchError || !request) return { error: "Request not found" };
  if (request.status !== "pending") return { error: `Cannot approve a ${request.status} request` };

  const { error: updateError } = await supabase
    .from("data_subject_requests")
    .update({
      status: "approved",
      approved_by: admin.user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data);

  if (updateError) return { error: updateError.message };

  if (request.subject_type === "speaker") {
    const steps = SPEAKER_ERASURE_STEPS.map((step) => ({
      request_id: parsed.data,
      step_order: step.order,
      step_name: step.name,
      step_category: step.category,
      status: "pending" as const,
    }));

    const { error: stepsError } = await supabase
      .from("data_subject_request_steps")
      .insert(steps);

    if (stepsError) return { error: stepsError.message };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "compliance.request_approved",
    category: "compliance",
    targetType: "data_subject_request",
    targetId: parsed.data,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/compliance/${parsed.data}`);
  revalidatePath("/compliance");
  return { success: true };
}

export async function executeDeletionPipeline(requestId: string) {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { error: "Invalid request ID" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  try {
    const supabase = createServiceClient();

    const { data: request, error: fetchError } = await supabase
      .from("data_subject_requests")
      .select("id, status, subject_auth_user_id, subject_type")
      .eq("id", parsed.data)
      .single();

    if (fetchError || !request) return { error: `Request not found: ${fetchError?.message ?? "no data"}` };
    if (request.status !== "approved") return { error: `Cannot execute a ${request.status} request` };

    if (request.subject_type !== "speaker") {
      return { error: `Pipeline for ${request.subject_type} not yet implemented` };
    }

    const authUserId = request.subject_auth_user_id as string | null;
    if (!authUserId) return { error: "No auth user linked to this request" };

    const { data: speaker } = await supabase
      .from("speakers")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!speaker) return { error: "Speaker not found for this auth user" };

    await supabase
      .from("data_subject_requests")
      .update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data);

    const { data: steps } = await supabase
      .from("data_subject_request_steps")
      .select("*")
      .eq("request_id", parsed.data)
      .order("step_order", { ascending: true });

    if (!steps || steps.length === 0) return { error: "No pipeline steps found" };

    const stepParams = {
      supabase,
      speakerId: speaker.id,
      authUserId,
      adminId: admin.user.id,
    };

    let allSucceeded = true;

    for (const step of steps) {
      if (step.status === "completed" || step.status === "skipped") continue;

      await supabase
        .from("data_subject_request_steps")
        .update({ status: "in_progress" })
        .eq("id", step.id);

      const result = await executeStep(step.step_name, stepParams);

      await supabase
        .from("data_subject_request_steps")
        .update({
          status: result.success ? "completed" : "failed",
          details: result.details,
          error_message: result.error ?? null,
          completed_at: new Date().toISOString(),
          completed_by: admin.user.id,
        })
        .eq("id", step.id);

      if (!result.success) {
        allSucceeded = false;
        break;
      }
    }

    const snapshotStep = steps.find((s) => s.step_name === "snapshot_data");
    let snapshotPath: string | null = null;
    if (snapshotStep) {
      const { data: updatedStep } = await supabase
        .from("data_subject_request_steps")
        .select("details")
        .eq("id", snapshotStep.id)
        .single();
      snapshotPath = (updatedStep?.details as Record<string, unknown>)?.snapshot_path as string ?? null;
    }

    if (allSucceeded) {
      await supabase
        .from("data_subject_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          data_snapshot_path: snapshotPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data);
    }

    await auditAdminAction({
      adminId: admin.user.id,
      action: allSucceeded ? "compliance.pipeline_completed" : "compliance.pipeline_failed",
      category: "compliance",
      targetType: "data_subject_request",
      targetId: parsed.data,
      details: { allSucceeded },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });

    revalidatePath(`/compliance/${parsed.data}`);
    revalidatePath("/compliance");
    revalidatePath("/accounts");
    return { success: allSucceeded };
  } catch (e) {
    console.error("[executeDeletionPipeline] Unhandled error:", e);
    return { error: `Pipeline failed: ${(e as Error).message}` };
  }
}

export async function retryDeletionStep(stepId: string) {
  const parsed = stepIdSchema.safeParse(stepId);
  if (!parsed.success) return { error: "Invalid step ID" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: step, error: stepError } = await supabase
    .from("data_subject_request_steps")
    .select("*, data_subject_requests!inner(id, subject_auth_user_id, status)")
    .eq("id", parsed.data)
    .single();

  if (stepError || !step) return { error: "Step not found" };
  if (step.status !== "failed") return { error: "Only failed steps can be retried" };

  const request = step.data_subject_requests as unknown as {
    id: string;
    subject_auth_user_id: string;
    status: string;
  };
  if (request.status !== "processing") return { error: "Request must be in processing state" };

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", request.subject_auth_user_id)
    .maybeSingle();

  const speakerId = speaker?.id ?? "unknown";

  await supabase
    .from("data_subject_request_steps")
    .update({ status: "in_progress", error_message: null })
    .eq("id", parsed.data);

  const result = await executeStep(step.step_name, {
    supabase,
    speakerId,
    authUserId: request.subject_auth_user_id,
    adminId: admin.user.id,
  });

  await supabase
    .from("data_subject_request_steps")
    .update({
      status: result.success ? "completed" : "failed",
      details: result.details,
      error_message: result.error ?? null,
      completed_at: new Date().toISOString(),
      completed_by: admin.user.id,
    })
    .eq("id", parsed.data);

  revalidatePath(`/compliance/${request.id}`);
  return { success: result.success, error: result.error };
}

export async function cancelDeletionRequest(requestId: string, reason: string) {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { error: "Invalid request ID" };

  const reasonParsed = z.string().min(1).max(2000).safeParse(reason);
  if (!reasonParsed.success) return { error: "Reason is required" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: request } = await supabase
    .from("data_subject_requests")
    .select("status, subject_email, subject_type, request_type")
    .eq("id", parsed.data)
    .single();

  if (!request) return { error: "Request not found" };
  if (request.status === "completed" || request.status === "cancelled") {
    return { error: `Cannot cancel a ${request.status} request` };
  }

  const { error } = await supabase
    .from("data_subject_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reasonParsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data);

  if (error) return { error: error.message };

  if (request.request_type === "erasure" && request.subject_type === "speaker") {
    await supabase
      .from("speakers")
      .update({ status: "active" })
      .eq("email", request.subject_email)
      .eq("status", "pending_delete");
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "compliance.request_cancelled",
    category: "compliance",
    targetType: "data_subject_request",
    targetId: parsed.data,
    details: { reason: reasonParsed.data },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/compliance/${parsed.data}`);
  revalidatePath("/compliance");
  revalidatePath("/accounts");
  return { success: true };
}

export async function rejectDeletionRequest(requestId: string, reason: string) {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { error: "Invalid request ID" };

  const reasonParsed = z.string().min(1).max(2000).safeParse(reason);
  if (!reasonParsed.success) return { error: "Reason is required" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: request } = await supabase
    .from("data_subject_requests")
    .select("status, subject_email, subject_type, request_type")
    .eq("id", parsed.data)
    .single();

  if (!request) return { error: "Request not found" };
  if (request.status !== "pending" && request.status !== "approved") {
    return { error: `Cannot reject a ${request.status} request` };
  }

  const { error } = await supabase
    .from("data_subject_requests")
    .update({
      status: "rejected",
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reasonParsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data);

  if (error) return { error: error.message };

  if (request.request_type === "erasure" && request.subject_type === "speaker") {
    await supabase
      .from("speakers")
      .update({ status: "active" })
      .eq("email", request.subject_email)
      .eq("status", "pending_delete");
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "compliance.request_rejected",
    category: "compliance",
    targetType: "data_subject_request",
    targetId: parsed.data,
    details: { reason: reasonParsed.data },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/compliance/${parsed.data}`);
  revalidatePath("/compliance");
  revalidatePath("/accounts");
  return { success: true };
}

export async function restoreAccountToActive(speakerEmail: string) {
  const emailParsed = z.string().email().safeParse(speakerEmail.trim().toLowerCase());
  if (!emailParsed.success) return { error: "Invalid email" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const email = emailParsed.data;

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (!speaker) return { error: "Speaker not found" };
  if (speaker.status !== "pending_delete") {
    return { error: `Account is ${speaker.status}, not pending delete` };
  }

  const { error: updateError } = await supabase
    .from("speakers")
    .update({ status: "active" })
    .eq("id", speaker.id);

  if (updateError) return { error: updateError.message };

  const { data: openRequests } = await supabase
    .from("data_subject_requests")
    .select("id, status")
    .eq("subject_email", email)
    .eq("request_type", "erasure")
    .in("status", ["pending", "approved", "on_hold"]);

  for (const req of openRequests ?? []) {
    await supabase
      .from("data_subject_requests")
      .update({
        status: "rejected",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: "Account restored to active by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    await auditAdminAction({
      adminId: admin.user.id,
      action: "compliance.request_rejected",
      category: "compliance",
      targetType: "data_subject_request",
      targetId: req.id,
      details: { reason: "Account restored to active by admin" },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "account.restored_to_active",
    category: "account",
    targetType: "speaker",
    targetId: speaker.id,
    details: { email, voidedRequests: (openRequests ?? []).length },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${speaker.id}`);
  revalidatePath("/compliance");
  return { success: true };
}

export async function lookupUserByEmail(email: string) {
  const emailParsed = z.string().email().safeParse(email.trim().toLowerCase());
  if (!emailParsed.success) return { error: "Invalid email" };

  try {
    await requireSuperAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();
  const results: {
    type: string;
    email: string;
    name: string | null;
    authUserId: string | null;
    id: string;
  }[] = [];

  const { data: speakers } = await supabase
    .from("speakers")
    .select("id, auth_user_id, name, email")
    .eq("email", emailParsed.data)
    .is("deleted_at", null);

  for (const s of speakers ?? []) {
    results.push({
      type: "speaker",
      email: s.email,
      name: s.name,
      authUserId: s.auth_user_id as string | null,
      id: s.id,
    });
  }

  const { data: sponsors } = await supabase
    .from("sponsor_accounts")
    .select("id, auth_user_id, company_name, email")
    .eq("email", emailParsed.data)
    .is("deleted_at", null);

  for (const sp of sponsors ?? []) {
    results.push({
      type: "sponsor",
      email: sp.email,
      name: sp.company_name,
      authUserId: sp.auth_user_id as string | null,
      id: sp.id,
    });
  }

  return { data: results };
}

const markNotificationSchema = z.object({
  requestId: z.string().uuid(),
  notificationEmail: z.string().email(),
  notificationMethod: z.enum(["email", "postal", "in_app", "other"]),
});

export async function markNotificationSent(input: z.infer<typeof markNotificationSchema>) {
  const parsed = markNotificationSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: request } = await supabase
    .from("data_subject_requests")
    .select("status, notification_sent_at")
    .eq("id", parsed.data.requestId)
    .single();

  if (!request) return { error: "Request not found" };
  if (request.status !== "completed") return { error: "Can only notify for completed requests" };
  if (request.notification_sent_at) return { error: "Notification already marked as sent" };

  const { error } = await supabase
    .from("data_subject_requests")
    .update({
      notification_email: parsed.data.notificationEmail,
      notification_sent_at: new Date().toISOString(),
      notification_method: parsed.data.notificationMethod,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId);

  if (error) return { error: error.message };

  await auditAdminAction({
    adminId: admin.user.id,
    action: "compliance.notification_sent",
    category: "compliance",
    targetType: "data_subject_request",
    targetId: parsed.data.requestId,
    details: {
      notificationEmail: parsed.data.notificationEmail,
      method: parsed.data.notificationMethod,
    },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/compliance/${parsed.data.requestId}`);
  revalidatePath("/compliance");
  return { success: true };
}
