import { createServiceClient } from "@fanflet/db/service";

export interface StepResult {
  success: boolean;
  details: Record<string, unknown>;
  error?: string;
}

type StepExecutor = (params: {
  supabase: ReturnType<typeof createServiceClient>;
  speakerId: string;
  authUserId: string;
  adminId: string;
}) => Promise<StepResult>;

export const SPEAKER_ERASURE_STEPS = [
  { name: "snapshot_data", category: "snapshot" as const, order: 1 },
  { name: "soft_delete_speaker", category: "soft_delete" as const, order: 2 },
  { name: "delete_sponsor_connections", category: "data_deletion" as const, order: 3 },
  { name: "delete_fanflets", category: "data_deletion" as const, order: 4 },
  { name: "delete_subscribers", category: "data_deletion" as const, order: 5 },
  { name: "delete_survey_questions", category: "data_deletion" as const, order: 6 },
  { name: "delete_resource_library", category: "data_deletion" as const, order: 7 },
  { name: "delete_subscriptions", category: "data_deletion" as const, order: 8 },
  { name: "purge_storage", category: "storage_cleanup" as const, order: 9 },
  { name: "delete_identity", category: "data_deletion" as const, order: 10 },
  { name: "delete_auth_user", category: "auth_deletion" as const, order: 11 },
  { name: "verify_deletion", category: "verification" as const, order: 12 },
] as const;

async function snapshotData({ supabase, speakerId, authUserId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const [speaker, fanflets, subscribers, library, subscriptions, connections] = await Promise.all([
    supabase.from("speakers").select("*").eq("id", speakerId).single(),
    supabase.from("fanflets").select("*, resource_blocks(*)").eq("speaker_id", speakerId),
    supabase.from("subscribers").select("*").eq("speaker_id", speakerId),
    supabase.from("resource_library").select("*").eq("speaker_id", speakerId),
    supabase.from("speaker_subscriptions").select("*").eq("speaker_id", speakerId),
    supabase.from("sponsor_connections").select("*").eq("speaker_id", speakerId),
  ]);

  const snapshot = {
    exported_at: new Date().toISOString(),
    speaker: speaker.data,
    fanflets: fanflets.data ?? [],
    subscribers: subscribers.data ?? [],
    resource_library: library.data ?? [],
    subscriptions: subscriptions.data ?? [],
    sponsor_connections: connections.data ?? [],
  };

  const snapshotPath = `compliance-snapshots/${authUserId}/${Date.now()}.json`;
  const { error: uploadError } = await supabase.storage
    .from("compliance-exports")
    .upload(snapshotPath, JSON.stringify(snapshot, null, 2), {
      contentType: "application/json",
      upsert: false,
    });

  if (uploadError) {
    return {
      success: true,
      details: {
        snapshot_stored: false,
        storage_error: uploadError.message,
        fanflet_count: fanflets.data?.length ?? 0,
        subscriber_count: subscribers.data?.length ?? 0,
      },
    };
  }

  return {
    success: true,
    details: {
      snapshot_stored: true,
      snapshot_path: snapshotPath,
      fanflet_count: fanflets.data?.length ?? 0,
      subscriber_count: subscribers.data?.length ?? 0,
      resource_library_count: library.data?.length ?? 0,
    },
  };
}

async function softDeleteSpeaker({ supabase, speakerId, adminId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { error } = await supabase
    .from("speakers")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: adminId,
      status: "deactivated",
    })
    .eq("id", speakerId);

  if (error) return { success: false, details: {}, error: error.message };
  return { success: true, details: { status: "deactivated" } };
}

async function deleteSponsorConnections({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { data, error } = await supabase
    .from("sponsor_connections")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");

  if (error) return { success: false, details: {}, error: error.message };
  return { success: true, details: { rows_deleted: data?.length ?? 0 } };
}

async function deleteFanflets({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id")
    .eq("speaker_id", speakerId);

  const fanfletCount = fanflets?.length ?? 0;

  const { error } = await supabase
    .from("fanflets")
    .delete()
    .eq("speaker_id", speakerId);

  if (error) return { success: false, details: {}, error: error.message };
  return {
    success: true,
    details: {
      fanflets_deleted: fanfletCount,
      cascaded: "resource_blocks, analytics_events, sms_bookmarks, survey_responses, sponsor_leads, sponsor_report_tokens, audience_saved_fanflets",
    },
  };
}

async function deleteSubscribers({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { data, error } = await supabase
    .from("subscribers")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");

  if (error) return { success: false, details: {}, error: error.message };
  return { success: true, details: { rows_deleted: data?.length ?? 0 } };
}

async function deleteSurveyQuestions({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { data, error } = await supabase
    .from("survey_questions")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");

  if (error) return { success: false, details: {}, error: error.message };
  return { success: true, details: { rows_deleted: data?.length ?? 0 } };
}

async function deleteResourceLibrary({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { data, error } = await supabase
    .from("resource_library")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");

  if (error) return { success: false, details: {}, error: error.message };
  return { success: true, details: { rows_deleted: data?.length ?? 0 } };
}

async function deleteSubscriptions({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const results: Record<string, number> = {};

  const { data: overrides } = await supabase
    .from("speaker_feature_overrides")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");
  results.feature_overrides = overrides?.length ?? 0;

  const { data: subs } = await supabase
    .from("speaker_subscriptions")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");
  results.subscriptions = subs?.length ?? 0;

  const { data: prefs } = await supabase
    .from("platform_communication_preferences")
    .delete()
    .eq("speaker_id", speakerId)
    .select("id");
  results.communication_preferences = prefs?.length ?? 0;

  return { success: true, details: results };
}

async function purgeStorage({ supabase, speakerId, authUserId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const cleaned: Record<string, number> = { avatars: 0, file_uploads: 0 };

  const { data: avatarFiles } = await supabase.storage
    .from("avatars")
    .list(authUserId, { limit: 1000 });

  if (avatarFiles && avatarFiles.length > 0) {
    const paths = avatarFiles
      .filter((f) => f.name)
      .map((f) => `${authUserId}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from("avatars").remove(paths);
      cleaned.avatars = paths.length;
    }
  }

  const { data: uploadDirs } = await supabase.storage
    .from("file-uploads")
    .list(speakerId, { limit: 1000 });

  if (uploadDirs) {
    for (const dir of uploadDirs) {
      if (!dir.name) continue;
      const { data: subFiles } = await supabase.storage
        .from("file-uploads")
        .list(`${speakerId}/${dir.name}`, { limit: 1000 });
      if (subFiles && subFiles.length > 0) {
        const paths = subFiles
          .filter((f) => f.name)
          .map((f) => `${speakerId}/${dir.name}/${f.name}`);
        if (paths.length > 0) {
          await supabase.storage.from("file-uploads").remove(paths);
          cleaned.file_uploads += paths.length;
        }
      }
    }
  }

  return { success: true, details: cleaned };
}

async function deleteIdentity({ supabase, speakerId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { error } = await supabase
    .from("speakers")
    .delete()
    .eq("id", speakerId);

  if (error) return { success: false, details: {}, error: error.message };
  return { success: true, details: { speaker_deleted: true } };
}

async function deleteAuthUser({ supabase, authUserId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const { error } = await supabase.auth.admin.deleteUser(authUserId);

  if (error) return { success: false, details: {}, error: error.message };
  return {
    success: true,
    details: {
      auth_user_deleted: true,
      cascaded: "mcp_api_keys, mcp_oauth_codes, mcp_oauth_tokens, user_roles, sponsor_accounts, audience_accounts",
    },
  };
}

async function verifyDeletion({ supabase, speakerId, authUserId }: Parameters<StepExecutor>[0]): Promise<StepResult> {
  const checks: Record<string, boolean> = {};

  const { data: speakerRow } = await supabase
    .from("speakers")
    .select("id")
    .eq("id", speakerId)
    .maybeSingle();
  checks.speaker_gone = !speakerRow;

  const { data: fanfletRows } = await supabase
    .from("fanflets")
    .select("id", { count: "exact", head: true })
    .eq("speaker_id", speakerId);
  checks.fanflets_gone = !fanfletRows || fanfletRows.length === 0;

  const { data: subRows } = await supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("speaker_id", speakerId);
  checks.subscribers_gone = !subRows || subRows.length === 0;

  const { data: authUser } = await supabase.auth.admin.getUserById(authUserId);
  checks.auth_user_gone = !authUser?.user;

  const allClean = Object.values(checks).every(Boolean);
  return {
    success: allClean,
    details: checks,
    error: allClean ? undefined : "Some data remains after deletion",
  };
}

const STEP_EXECUTORS: Record<string, StepExecutor> = {
  snapshot_data: snapshotData,
  soft_delete_speaker: softDeleteSpeaker,
  delete_sponsor_connections: deleteSponsorConnections,
  delete_fanflets: deleteFanflets,
  delete_subscribers: deleteSubscribers,
  delete_survey_questions: deleteSurveyQuestions,
  delete_resource_library: deleteResourceLibrary,
  delete_subscriptions: deleteSubscriptions,
  purge_storage: purgeStorage,
  delete_identity: deleteIdentity,
  delete_auth_user: deleteAuthUser,
  verify_deletion: verifyDeletion,
};

export async function executeStep(
  stepName: string,
  params: Parameters<StepExecutor>[0]
): Promise<StepResult> {
  const executor = STEP_EXECUTORS[stepName];
  if (!executor) {
    return { success: false, details: {}, error: `Unknown step: ${stepName}` };
  }
  return executor(params);
}
