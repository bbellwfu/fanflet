import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getAuditLog, getAuditAdminUsers } from "./actions";
import { AuditLogDashboard } from "./audit-log-dashboard";

interface AuditLogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/");
  }

  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const adminId = typeof params.adminId === "string" ? params.adminId : undefined;
  const startDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate = typeof params.endDate === "string" ? params.endDate : undefined;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  const [logResult, adminsResult] = await Promise.all([
    getAuditLog({ category, adminId, startDate, endDate, page }),
    getAuditAdminUsers(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Audit Log</h1>
        <p className="text-sm text-fg-muted mt-1">
          Complete record of all admin actions for compliance and accountability.
        </p>
      </div>
      <AuditLogDashboard
        entries={logResult.entries}
        totalCount={logResult.totalCount}
        admins={adminsResult.admins}
        currentFilters={{ category, adminId, startDate, endDate, page }}
      />
    </div>
  );
}
