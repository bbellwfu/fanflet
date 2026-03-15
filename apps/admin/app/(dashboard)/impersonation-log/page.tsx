import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDateTime } from "@fanflet/db/timezone";
import {
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";

export default async function ImpersonationLogPage() {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: adminPrefs } = await authSupabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  const { data: sessions, error: sessionsError } = await authSupabase
    .from("impersonation_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const allSessions = sessions ?? [];
  if (sessionsError) {
    console.error("[impersonation-log] Failed to load sessions:", sessionsError);
  }

  const adminIds = [...new Set(allSessions.map((s) => s.admin_id))];
  const targetIds = [...new Set(allSessions.map((s) => s.target_user_id))];
  const allUserIds = [...new Set([...adminIds, ...targetIds])].filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );

  const userMap = new Map<string, { email: string; name: string }>();
  try {
    const serviceClient = createServiceClient();
    for (const userId of allUserIds) {
      const { data } = await serviceClient.auth.admin.getUserById(userId);
      if (data?.user) {
        userMap.set(userId, {
          email: data.user.email ?? "unknown",
          name:
            (data.user.user_metadata?.name as string) ??
            data.user.email ??
            "Unknown",
        });
      }
    }
  } catch (e) {
    console.error("[impersonation-log] Failed to resolve user names:", e);
  }

  const activeSessions = allSessions.filter(
    (s) => !s.ended_at && new Date(s.expires_at) > new Date()
  );
  const recentSessions = allSessions.filter(
    (s) => s.ended_at || new Date(s.expires_at) <= new Date()
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Impersonation Log
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Audit trail of all admin impersonation sessions
        </p>
      </div>

      {sessionsError && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 text-sm text-fg-secondary">
          Could not load sessions. You may need the database migration that
          allows admins to read the impersonation log.
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Active Sessions
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {activeSessions.length}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Total Sessions (Last 100)
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {allSessions.length}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2">
            Write-Enabled Sessions
          </p>
          <p className="text-2xl font-semibold text-fg tracking-tight">
            {allSessions.filter((s) => s.write_enabled).length}
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="bg-warning/5 rounded-lg border border-warning/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-warning/20 flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-warning">
              Active Sessions ({activeSessions.length})
            </h2>
          </div>
          <div className="divide-y divide-warning/10">
            {activeSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                userMap={userMap}
                adminTimezone={adminTimezone}
                isActive
              />
            ))}
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Session History</h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                userMap={userMap}
                adminTimezone={adminTimezone}
              />
            ))
          ) : (
            <div className="px-5 py-10 text-center">
              <EyeIcon className="w-8 h-8 text-fg-muted mx-auto mb-2" />
              <p className="text-[13px] text-fg-muted">
                No impersonation sessions yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: Record<string, unknown>;
  userMap: Map<string, { email: string; name: string }>;
  adminTimezone: string | null;
  isActive?: boolean;
}

function SessionRow({ session, userMap, adminTimezone, isActive }: SessionRowProps) {
  const adminInfo = userMap.get(session.admin_id as string);
  const targetInfo = userMap.get(session.target_user_id as string);
  const endedAt = session.ended_at as string | null;
  const expiresAt = session.expires_at as string;
  const startedAt = session.started_at as string | null;
  const createdAt = session.created_at as string;
  const writeEnabled = session.write_enabled as boolean;
  const reason = session.reason as string | null;
  const targetRole = session.target_role as string;

  const isExpired = !endedAt && new Date(expiresAt) <= new Date();

  let duration = "—";
  if (startedAt) {
    const end = endedAt
      ? new Date(endedAt)
      : isExpired
      ? new Date(expiresAt)
      : new Date();
    const diffMs = end.getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) duration = "<1 min";
    else if (minutes < 60) duration = `${minutes} min`;
    else duration = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-fg">
              {adminInfo?.name ?? "Unknown Admin"}
            </span>
            <span className="text-[12px] text-fg-muted">impersonated</span>
            <span className="text-[13px] font-medium text-fg">
              {targetInfo?.name ?? "Unknown User"}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                targetRole === "speaker"
                  ? "bg-primary-muted text-primary-soft"
                  : "bg-surface-elevated text-fg-muted"
              }`}
            >
              {targetRole}
            </span>
            {writeEnabled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-error/10 text-error">
                Write
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-fg-muted">
            <span>{formatDateTime(createdAt, adminTimezone)}</span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {duration}
            </span>
            {reason && (
              <span className="truncate max-w-xs" title={reason}>
                Reason: {reason}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-warning/20 text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              Active
            </span>
          ) : endedAt ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-success/10 text-success">
              <CheckCircleIcon className="w-3 h-3" />
              Ended
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-surface-elevated text-fg-muted">
              <XCircleIcon className="w-3 h-3" />
              Expired
            </span>
          )}
        </div>
      </div>

      <div className="text-[12px] text-fg-muted">
        {targetInfo?.email ?? (session.target_user_id as string)}
      </div>
    </div>
  );
}
