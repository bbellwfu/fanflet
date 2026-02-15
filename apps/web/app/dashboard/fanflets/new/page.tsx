import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewFanfletForm } from "./new-fanflet-form";

export default async function NewFanfletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("slug")
    .eq("auth_user_id", user.id)
    .single();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
          Create New Fanflet
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up a new resource page for your talk or event.
        </p>
      </div>

      <NewFanfletForm speakerSlug={speaker?.slug ?? null} />
    </div>
  );
}
