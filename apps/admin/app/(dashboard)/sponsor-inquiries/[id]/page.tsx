import { notFound } from "next/navigation";
import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDate } from "@fanflet/db/timezone";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InquiryDetailForm } from "./inquiry-detail-form";

export default async function SponsorInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const { data: adminPrefs } = await supabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user!.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  const { data: inquiry, error } = await supabase
    .from("sponsor_inquiries")
    .select("id, name, email, details, status, notes, created_at")
    .eq("id", id)
    .single();

  if (error || !inquiry) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/sponsor-inquiries"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sponsor Inquiries
        </Link>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h1 className="text-xl font-semibold text-fg">{inquiry.name}</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Submitted {formatDate(inquiry.created_at, adminTimezone)}
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-1">
              Email
            </p>
            <a
              href={`mailto:${inquiry.email}`}
              className="text-primary hover:underline font-medium"
            >
              {inquiry.email}
            </a>
          </div>
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-1">
              Details
            </p>
            <p className="text-fg whitespace-pre-wrap text-[13px] leading-relaxed">
              {inquiry.details}
            </p>
          </div>
        </div>
      </div>

      <InquiryDetailForm
        inquiryId={inquiry.id}
        initialStatus={inquiry.status}
        initialNotes={inquiry.notes ?? ""}
      />
    </div>
  );
}
