import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorOnboardingForm } from "./onboarding-form";

export default async function SponsorOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sponsor/onboarding");
  }

  const { data: existing } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (existing) {
    redirect("/sponsor/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md border-[#e2e8f0] bg-white shadow-xl shadow-[#1B365D]/5">
        <CardHeader className="space-y-4 text-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="Fanflet – home"
          >
            <Image src="/logo.png" alt="" width={48} height={48} priority className="h-12 w-12" />
            <span className="text-2xl font-bold tracking-tight text-[#1B365D]">Fanflet</span>
          </Link>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-[#1B365D]">Complete your sponsor profile</CardTitle>
            <CardDescription className="text-muted-foreground">
              Tell us about your company so speakers can connect with you.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SponsorOnboardingForm authUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
