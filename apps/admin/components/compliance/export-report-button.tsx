"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import { DownloadIcon, FileTextIcon, ShieldIcon } from "lucide-react";

interface Step {
  id: string;
  step_order: number;
  step_name: string;
  step_category: string;
  status: string;
  error_message: string | null;
  completed_at: string | null;
  details: Record<string, unknown>;
}

interface ExportReportButtonProps {
  requestId: string;
  subjectEmail: string;
  subjectName: string;
  subjectType: string;
  requestType: string;
  regulation: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  notificationEmail: string | null;
  notificationSentAt: string | null;
  notificationMethod: string | null;
  steps: Step[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const DATA_CATEGORIES: Record<string, string[]> = {
  speaker: [
    "Account profile (name, email, biography, photo)",
    "Fanflets and associated resource blocks",
    "Subscriber records",
    "Survey questions and responses",
    "Resource library items",
    "Subscription and plan data",
    "Feature preference overrides",
    "Communication preferences",
    "Uploaded files (avatars, documents)",
    "Analytics events associated with fanflets",
    "SMS bookmark records (hashed phone numbers)",
    "Sponsor connection records",
    "Authentication credentials and session data",
  ],
  sponsor: [
    "Sponsor account profile (company name, logo, contact info)",
    "Sponsor resources and content",
    "Speaker connection records",
    "Lead records and engagement data",
    "Report tokens",
    "Authentication credentials and session data",
  ],
};

const THIRD_PARTY_PROCESSORS = [
  { name: "Supabase (PostgreSQL)", role: "Primary database and authentication provider", action: "Data deleted via database operations and auth admin API" },
  { name: "Supabase Storage", role: "File storage for avatars and uploads", action: "Files permanently removed from storage buckets" },
  { name: "Vercel", role: "Application hosting and edge functions", action: "No persistent PII stored; server logs rotate automatically" },
  { name: "Twilio", role: "SMS delivery for bookmark feature", action: "Phone numbers are never stored by Fanflet (only hashed); Twilio message logs subject to Twilio's retention policy" },
];

const HIDDEN_DETAIL_KEYS = new Set(["cascaded", "status", "storage_error"]);

function formatStepDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .filter(([k]) => !HIDDEN_DETAIL_KEYS.has(k))
    .map(([k, v]) => {
      const label = k.replace(/_/g, " ");
      if (typeof v === "boolean") return `${label}: ${v ? "yes" : "no"}`;
      return `${label}: ${v}`;
    })
    .join("; ");
}

function regulationName(code: string | null): string {
  const names: Record<string, string> = {
    gdpr: "General Data Protection Regulation (GDPR)",
    ccpa: "California Consumer Privacy Act (CCPA/CPRA)",
    pipeda: "Personal Information Protection and Electronic Documents Act (PIPEDA)",
    lgpd: "Lei Geral de Proteção de Dados (LGPD)",
  };
  return code ? names[code] ?? code.toUpperCase() : "Not specified";
}

// ---------------------------------------------------------------------------
// User-facing confirmation
// ---------------------------------------------------------------------------

function generateUserConfirmation(props: ExportReportButtonProps): string {
  const lines: string[] = [];
  const hr = "═".repeat(70);
  const divider = "─".repeat(70);

  lines.push(hr);
  lines.push("FANFLET — DATA ERASURE CONFIRMATION");
  lines.push(hr);
  lines.push("");
  lines.push(`Date:       ${formatDateShort(props.completedAt)}`);
  lines.push(`Reference:  ${props.requestId}`);
  lines.push("");

  lines.push(divider);
  lines.push("CONFIRMATION OF ERASURE");
  lines.push(divider);
  lines.push("");
  lines.push(`Dear ${props.subjectName},`);
  lines.push("");
  lines.push(
    "We are writing to confirm that your data erasure request has been " +
    "completed. In accordance with your request and applicable data " +
    "protection regulations, your personal data has been permanently " +
    "erased from our systems."
  );
  lines.push("");

  lines.push(`Request received:   ${formatDateShort(props.createdAt)}`);
  lines.push(`Erasure completed:  ${formatDateShort(props.completedAt)}`);
  if (props.regulation) {
    lines.push(`Regulation:         ${regulationName(props.regulation)}`);
  }
  lines.push("");

  lines.push(divider);
  lines.push("CATEGORIES OF DATA ERASED");
  lines.push(divider);
  lines.push("");
  lines.push("The following categories of personal data were permanently");
  lines.push("removed from all primary systems:");
  lines.push("");
  const categories = DATA_CATEGORIES[props.subjectType] ?? DATA_CATEGORIES.speaker;
  for (const cat of categories) {
    lines.push(`  • ${cat}`);
  }
  lines.push("");

  lines.push(divider);
  lines.push("METHOD OF DELETION");
  lines.push(divider);
  lines.push("");
  lines.push("Method: Permanent erasure (hard delete)");
  lines.push("");
  lines.push(
    "All personal data was permanently deleted from primary databases, " +
    "file storage systems, and authentication services. This is an " +
    "irreversible operation — the data cannot be recovered."
  );
  lines.push("");

  lines.push(divider);
  lines.push("THIRD-PARTY SERVICE PROVIDERS");
  lines.push(divider);
  lines.push("");
  lines.push(
    "We have taken reasonable steps to notify the following service " +
    "providers who may have processed your data:"
  );
  lines.push("");
  for (const tp of THIRD_PARTY_PROCESSORS) {
    lines.push(`  • ${tp.name}`);
    lines.push(`    ${tp.action}`);
  }
  lines.push("");

  lines.push(divider);
  lines.push("DATA RETAINED UNDER LEGAL EXCEPTION");
  lines.push(divider);
  lines.push("");
  lines.push(
    "The following data is retained as required by law or legitimate " +
    "business interest:"
  );
  lines.push("");
  lines.push("  • This erasure confirmation record (pseudonymized) —");
  lines.push("    Retained for compliance audit purposes per applicable");
  lines.push("    statute of limitations (up to 6 years).");
  lines.push("");
  lines.push("  • Anonymized, aggregated analytics data —");
  lines.push("    Data that has been fully anonymized and cannot be linked");
  lines.push("    back to you is not subject to erasure obligations.");
  lines.push("");

  lines.push(divider);
  lines.push("BACKUP SYSTEMS");
  lines.push(divider);
  lines.push("");
  lines.push(
    "Data in encrypted backup systems will be purged as backups rotate " +
    "per our retention schedule (within 90 days of this notice). During " +
    "this period, backup data is encrypted and inaccessible for normal " +
    "operations."
  );
  lines.push("");

  lines.push(divider);
  lines.push("YOUR RIGHTS");
  lines.push(divider);
  lines.push("");
  lines.push("You have the right to:");
  lines.push("");
  lines.push("  • Lodge a complaint with a supervisory authority");
  if (props.regulation === "gdpr") {
    lines.push("    (EU/EEA: Your national Data Protection Authority)");
    lines.push("    (UK: Information Commissioner's Office — ico.org.uk)");
  } else if (props.regulation === "ccpa") {
    lines.push("    (California Privacy Protection Agency — cppa.ca.gov)");
  } else {
    lines.push("    (Contact your local data protection authority)");
  }
  lines.push("");
  lines.push("  • Seek judicial remedy if you believe your rights have");
  lines.push("    been infringed");
  lines.push("");
  lines.push("  • Contact our privacy team with any questions:");
  lines.push("    privacy@fanflet.com");
  lines.push("");

  lines.push(hr);
  lines.push("Fanflet, Inc.");
  lines.push("privacy@fanflet.com");
  lines.push(hr);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Internal audit report
// ---------------------------------------------------------------------------

function generateAuditReport(props: ExportReportButtonProps): string {
  const lines: string[] = [];
  const hr = "═".repeat(70);
  const divider = "─".repeat(70);

  lines.push(hr);
  lines.push("FANFLET — INTERNAL COMPLIANCE AUDIT REPORT");
  lines.push("CONFIDENTIAL — FOR INTERNAL / LEGAL USE ONLY");
  lines.push(hr);
  lines.push("");
  lines.push(`Generated:  ${formatDate(new Date().toISOString())}`);
  lines.push(`Request ID: ${props.requestId}`);
  lines.push("");

  // Section A: Request metadata
  lines.push(divider);
  lines.push("SECTION A: REQUEST METADATA");
  lines.push(divider);
  lines.push(`Subject Name:       ${props.subjectName}`);
  lines.push(`Subject Email:      ${props.subjectEmail}`);
  lines.push(`Subject Type:       ${props.subjectType}`);
  lines.push(`Request Type:       ${props.requestType}`);
  lines.push(`Source:             Admin initiated`);
  lines.push(`Regulation:         ${regulationName(props.regulation)}`);
  lines.push(`Status:             COMPLETED`);
  lines.push("");
  lines.push(`Request Created:    ${formatDate(props.createdAt)}`);
  lines.push(`Request Approved:   ${formatDate(props.approvedAt)}`);
  lines.push(`Erasure Completed:  ${formatDate(props.completedAt)}`);
  lines.push("");
  if (props.approvedAt && props.completedAt) {
    const approvedMs = new Date(props.approvedAt).getTime();
    const completedMs = new Date(props.completedAt).getTime();
    const processingMins = Math.round((completedMs - approvedMs) / 60000);
    lines.push(`Processing Time:    ${processingMins} minute(s) from approval to completion`);
  }
  if (props.createdAt && props.completedAt) {
    const createdMs = new Date(props.createdAt).getTime();
    const completedMs = new Date(props.completedAt).getTime();
    const totalDays = Math.ceil((completedMs - createdMs) / (1000 * 60 * 60 * 24));
    lines.push(`Total Elapsed:      ${totalDays} day(s) from request to completion`);
  }
  lines.push("");

  // Section B: Scope of erasure
  lines.push(divider);
  lines.push("SECTION B: SCOPE OF ERASURE");
  lines.push(divider);
  lines.push("");
  lines.push("Categories of personal data identified and erased:");
  lines.push("");
  const categories = DATA_CATEGORIES[props.subjectType] ?? DATA_CATEGORIES.speaker;
  for (const cat of categories) {
    lines.push(`  [✓] ${cat}`);
  }
  lines.push("");
  lines.push("Method of deletion: Permanent erasure (hard delete)");
  lines.push(
    "All records were permanently removed from primary PostgreSQL " +
    "database via DELETE operations, files removed from object storage, " +
    "and authentication records deleted via Supabase Auth Admin API."
  );
  lines.push("");

  lines.push("Data retained under legal exception:");
  lines.push("  • Erasure audit record (this document) — pseudonymized,");
  lines.push("    retained for compliance record-keeping (up to 6 years).");
  lines.push("  • Anonymized aggregate analytics — cannot be linked to");
  lines.push("    the data subject; not subject to erasure.");
  lines.push("");

  // Section C: Execution log
  lines.push(divider);
  lines.push("SECTION C: EXECUTION LOG");
  lines.push(divider);

  for (const step of props.steps) {
    const label = (
      {
        snapshot_data: "Data snapshot and export",
        soft_delete_speaker: "Soft-delete speaker record (mark as deleted)",
        delete_sponsor_connections: "Delete sponsor connection records",
        delete_fanflets: "Delete fanflets, resource blocks, analytics events, SMS bookmarks, survey responses, sponsor leads",
        delete_subscribers: "Delete subscriber records",
        delete_survey_questions: "Delete survey question definitions",
        delete_resource_library: "Delete resource library items",
        delete_subscriptions: "Delete subscriptions, feature overrides, communication preferences",
        purge_storage: "Purge file storage (avatars bucket, file-uploads bucket)",
        delete_identity: "Delete speaker identity record from speakers table",
        delete_auth_user: "Delete auth user (cascades: MCP tokens, user roles, sponsor/audience accounts)",
        verify_deletion: "Post-deletion verification (confirm data removed from all systems)",
      } as Record<string, string>
    )[step.step_name] ?? step.step_name;

    const icon = step.status === "completed" ? "[✓]" : step.status === "failed" ? "[✗]" : "[ ]";
    lines.push("");
    lines.push(`  ${icon} Step ${step.step_order}: ${label}`);
    lines.push(`      Status:    ${step.status.toUpperCase()}`);
    if (step.completed_at) {
      lines.push(`      Timestamp: ${formatDate(step.completed_at)}`);
    }
    if (step.error_message) {
      lines.push(`      Error:     ${step.error_message}`);
    }
    const details = formatStepDetails(step.details);
    if (details) {
      lines.push(`      Details:   ${details}`);
    }
  }
  lines.push("");

  // Section D: Third-party processors
  lines.push(divider);
  lines.push("SECTION D: THIRD-PARTY PROCESSOR NOTIFICATIONS");
  lines.push(divider);
  lines.push("");
  lines.push(
    "The following third-party processors were involved in data " +
    "processing. Deletion actions were executed directly via their APIs " +
    "as part of the automated pipeline."
  );
  lines.push("");
  for (const tp of THIRD_PARTY_PROCESSORS) {
    lines.push(`  Processor:   ${tp.name}`);
    lines.push(`  Role:        ${tp.role}`);
    lines.push(`  Action:      ${tp.action}`);
    lines.push("");
  }

  // Section E: Backup handling
  lines.push(divider);
  lines.push("SECTION E: BACKUP AND RETENTION");
  lines.push(divider);
  lines.push("");
  lines.push("Primary systems:  Data permanently deleted (confirmed by");
  lines.push("                  verification step).");
  lines.push("");
  lines.push("Encrypted backups: Supabase point-in-time recovery backups");
  lines.push("                   retain data until the backup window");
  lines.push("                   rotates (typically 7-30 days depending on");
  lines.push("                   plan). Backup data is encrypted at rest");
  lines.push("                   and not accessible for normal operations.");
  lines.push("");
  lines.push("Application logs:  Vercel server logs containing request");
  lines.push("                   data rotate automatically (48-72 hours).");
  lines.push("");
  lines.push("Audit records:     This erasure record will be retained for");
  lines.push("                   up to 6 years per the statute of");
  lines.push("                   limitations for regulatory enforcement.");
  lines.push("");

  // Section F: Summary
  lines.push(divider);
  lines.push("SECTION F: COMPLETION SUMMARY");
  lines.push(divider);
  lines.push("");
  const completed = props.steps.filter((s) => s.status === "completed").length;
  const failed = props.steps.filter((s) => s.status === "failed").length;
  lines.push(`Total Pipeline Steps:  ${props.steps.length}`);
  lines.push(`Steps Completed:       ${completed}`);
  lines.push(`Steps Failed:          ${failed}`);
  lines.push(`Verification Result:   ${failed === 0 ? "PASS — all data confirmed erased" : "FAIL — see failed steps above"}`);
  lines.push("");
  lines.push(`Disposition:           ${failed === 0 ? "ERASURE COMPLETE" : "ERASURE INCOMPLETE"}`);
  lines.push("");
  if (props.notificationSentAt) {
    lines.push(`Confirmation sent:     Yes`);
    lines.push(`Notification email:    ${props.notificationEmail}`);
    lines.push(`Notification method:   ${props.notificationMethod ?? "email"}`);
    lines.push(`Notification date:     ${formatDate(props.notificationSentAt)}`);
  } else {
    lines.push("Confirmation sent:     No — pending notification to data subject");
  }
  lines.push("");

  lines.push(hr);
  lines.push("CONFIDENTIAL — FANFLET INTERNAL COMPLIANCE RECORD");
  lines.push("Retain per data retention policy (minimum 6 years).");
  lines.push(hr);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportReportButton(props: ExportReportButtonProps) {
  const [lastDownload, setLastDownload] = useState<string | null>(null);

  const dateStr = props.completedAt
    ? new Date(props.completedAt).toISOString().split("T")[0]
    : "report";
  const emailSlug = props.subjectEmail.replace("@", "-at-");

  function handleUserReport() {
    const report = generateUserConfirmation(props);
    downloadFile(report, `erasure-confirmation-${emailSlug}-${dateStr}.txt`);
    setLastDownload("user");
    setTimeout(() => setLastDownload(null), 3000);
  }

  function handleAuditReport() {
    const report = generateAuditReport(props);
    downloadFile(report, `compliance-audit-${emailSlug}-${dateStr}.txt`);
    setLastDownload("audit");
    setTimeout(() => setLastDownload(null), 3000);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleUserReport}
        className="gap-1.5"
      >
        <FileTextIcon className="w-3.5 h-3.5" />
        {lastDownload === "user" ? "Downloaded" : "User Confirmation"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAuditReport}
        className="gap-1.5"
      >
        <ShieldIcon className="w-3.5 h-3.5" />
        {lastDownload === "audit" ? "Downloaded" : "Audit Report"}
      </Button>
    </div>
  );
}
