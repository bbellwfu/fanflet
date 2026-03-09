import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getAdminTeam, getSuperAdminCount } from "./actions";
import { AdminTeamDashboard } from "./admin-team-dashboard";

export default async function AdminTeamPage() {
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/");
  }

  const [teamResult, superAdminCount] = await Promise.all([
    getAdminTeam(),
    getSuperAdminCount(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Admin Team</h1>
        <p className="text-sm text-fg-muted mt-1">
          Manage who has access to the admin portal and their permission level.
        </p>
      </div>
      <AdminTeamDashboard
        admins={teamResult.admins}
        invitations={teamResult.invitations}
        superAdminCount={superAdminCount}
      />
    </div>
  );
}
