import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewRequestForm } from "@/components/compliance/new-request-form";

export default function NewComplianceRequestPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link
          href="/compliance"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Compliance
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          New Data Subject Request
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Create a data subject request for account deletion, data export, or other compliance actions.
        </p>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle p-6">
        <NewRequestForm />
      </div>
    </div>
  );
}
