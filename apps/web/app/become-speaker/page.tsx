import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BecomeSpeakerForm } from "./become-speaker-form";

export default async function BecomeSpeakerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingSpeaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingSpeaker) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg border p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Add Speaker Profile
          </h1>
          <p className="text-sm text-slate-600">
            Create a speaker profile to start building fanflets and sharing resources with your audience.
          </p>
        </div>
        <BecomeSpeakerForm userEmail={user.email ?? ""} />
      </div>
    </div>
  );
}
