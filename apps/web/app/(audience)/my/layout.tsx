import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { SessionMonitor } from "@/components/auth/session-monitor";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AudiencePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: audience } = await supabase
    .from("audience_accounts")
    .select("id, display_name, email, avatar_url")
    .eq("auth_user_id", user.id)
    .single();

  if (!audience) {
    redirect("/login");
  }

  const displayName = audience.display_name || audience.email;

  return (
    <div className="min-h-screen bg-slate-50">
      <SessionMonitor />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 h-14">
          <Link
            href="/my"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-base font-bold tracking-tight text-[#1B365D]">
              My Fanflets
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">
              {displayName}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
