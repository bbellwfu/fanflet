import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getAiUsageLogs, getAiUsageStats, getAiUsageAdmins } from "./actions";
import { AiUsageDashboard } from "./ai-usage-dashboard";

interface AiUsagePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AiUsagePage({ searchParams }: AiUsagePageProps) {
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/");
  }

  const params = await searchParams;
  const filters = {
    featureName: typeof params.feature === "string" ? params.feature : undefined,
    adminId: typeof params.adminId === "string" ? params.adminId : undefined,
    startDate: typeof params.startDate === "string" ? params.startDate : undefined,
    endDate: typeof params.endDate === "string" ? params.endDate : undefined,
    page: typeof params.page === "string" ? parseInt(params.page, 10) : 1,
  };

  const [logsResult, statsResult, adminsResult] = await Promise.all([
    getAiUsageLogs(filters),
    getAiUsageStats(),
    getAiUsageAdmins(),
  ]);

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">AI Utilization</h1>
        <p className="text-sm text-fg-muted mt-1">
          Monitor platform-wide AI usage, performance, and estimated costs.
        </p>
      </div>

      <AiUsageDashboard 
        logs={logsResult.entries}
        totalCount={logsResult.totalCount}
        stats={statsResult.stats}
        admins={adminsResult.admins}
        currentFilters={filters}
      />
    </div>
  );
}
