import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Link2, Clock } from "lucide-react";

export default async function SponsorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sponsor/dashboard");
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, is_verified")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/sponsor/dashboard" className="font-semibold text-[#1B365D]">
              {sponsor.company_name}
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/sponsor/dashboard"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LayoutDashboard className="w-4 h-4 inline mr-1.5" />
                Dashboard
              </Link>
              <Link
                href="/sponsor/leads"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Users className="w-4 h-4 inline mr-1.5" />
                Leads
              </Link>
              <Link
                href="/sponsor/connections"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Link2 className="w-4 h-4 inline mr-1.5" />
                Connections
              </Link>
            </nav>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Fanflet
          </Link>
        </div>
      </header>
      {!sponsor.is_verified && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-medium">Account pending verification.</span>{" "}
              Your profile is under review by the Fanflet team. Once verified, speakers will be able to discover and connect with you.
            </p>
          </div>
        </div>
      )}
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
