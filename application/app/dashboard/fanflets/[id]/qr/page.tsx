import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/config";
import { redirect, notFound } from "next/navigation";
import { QRDownload } from "@/components/fanflet-builder/qr-download";

export default async function FanfletQRPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, slug")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/dashboard/settings");

  const { data: fanflet } = await supabase
    .from("fanflets")
    .select("id, title, slug, status")
    .eq("id", id)
    .eq("speaker_id", speaker.id)
    .single();

  if (!fanflet) notFound();

  const baseUrl = getSiteUrl();
  const publicUrl =
    fanflet.status === "published" && speaker.slug
      ? `${baseUrl}/${speaker.slug}/${fanflet.slug}`
      : null;

  return (
    <QRDownload
      fanfletId={fanflet.id}
      fanfletTitle={fanflet.title}
      publicUrl={publicUrl}
      slug={fanflet.slug}
    />
  );
}
