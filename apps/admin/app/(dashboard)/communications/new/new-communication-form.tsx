"use client";

import { useState, useTransition, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import { Label } from "@fanflet/ui/label";
import { Textarea } from "@fanflet/ui/textarea";
import { toast } from "sonner";
import {
  SendIcon,
  SaveIcon,
  EyeIcon,
  FlaskConicalIcon,
  Loader2Icon,
  ArrowLeftIcon,
  TrashIcon,
  CalendarIcon,
  SparklesIcon,
  FileTextIcon,
  PenLineIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  ArchiveIcon,
} from "lucide-react";
import {
  createCommunication,
  updateDraft,
  sendCommunication,
  sendTestEmail,
  deleteDraft,
  archiveWorklog,
} from "../actions";
import Link from "next/link";
import type { WorklogEntry } from "@/lib/worklog-types";

// --- Types ---

interface DraftData {
  id: string;
  title: string;
  sourceReference: string | null;
  subject: string;
  bodyHtml: string;
}

interface WorklogWithStatus extends WorklogEntry {
  commStatus: string | null;
}

interface NewCommunicationFormProps {
  draft: DraftData | null;
  worklogs: WorklogWithStatus[];
  preselectedWorklog: string | null;
}

interface CheckedFeature {
  name: string;
  description: string;
  checked: boolean;
  /** When true, excluded from speaker/sponsor email (admin-internal only). */
  adminOnly?: boolean;
}

interface CheckedItem {
  text: string;
  checked: boolean;
  /** When true, excluded from speaker/sponsor email (admin-internal only). */
  adminOnly?: boolean;
}

type Step = "select" | "compose" | "preview";

/** Keywords that suggest an item is admin/internal-only (excluded from speaker email by default). */
const ADMIN_ONLY_KEYWORDS = [
  "impersonat",       // impersonation, impersonate
  "audit log",
  "platform admin",
  "back office",
  "service role",
  "admin dashboard",
  "MCP server",
  "RLS policy",
  "admin only",
];

function isAdminOnlyItem(...texts: string[]): boolean {
  const combined = texts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!combined) return false;
  return ADMIN_ONLY_KEYWORDS.some((kw) => combined.includes(kw));
}

// --- HTML Generation ---

const SECTION_HEADING_STYLE =
  'style="color:#1B365D; font-size:17px; font-weight:700; margin:28px 0 10px 0; padding:0;"';
const LIST_STYLE =
  'style="padding-left:20px; margin:0 0 8px 0;"';
const LIST_ITEM_STYLE =
  'style="margin-bottom:10px; line-height:1.6;"';

function generateEmailHtml(
  overview: string,
  features: CheckedFeature[],
  bugFixes: CheckedItem[],
  infrastructure: CheckedItem[]
): string {
  const parts: string[] = [];

  if (overview.trim()) {
    parts.push(
      `<p style="margin:0 0 20px 0; line-height:1.6;">${escapeHtml(overview.trim())}</p>`
    );
  }

  const checkedFeatures = features.filter((f) => f.checked);
  if (checkedFeatures.length > 0) {
    parts.push(`<h2 ${SECTION_HEADING_STYLE}>New Features</h2>`);
    parts.push(`<ul ${LIST_STYLE}>`);
    for (const f of checkedFeatures) {
      parts.push(
        `<li ${LIST_ITEM_STYLE}><strong>${escapeHtml(f.name)}</strong> &mdash; ${escapeHtml(f.description)}</li>`
      );
    }
    parts.push(`</ul>`);
  }

  const checkedBugs = bugFixes.filter((b) => b.checked);
  if (checkedBugs.length > 0) {
    parts.push(`<h2 ${SECTION_HEADING_STYLE}>Bug Fixes</h2>`);
    parts.push(`<ul ${LIST_STYLE}>`);
    for (const b of checkedBugs) {
      parts.push(`<li ${LIST_ITEM_STYLE}>${escapeHtml(b.text)}</li>`);
    }
    parts.push(`</ul>`);
  }

  const checkedInfra = infrastructure.filter((i) => i.checked);
  if (checkedInfra.length > 0) {
    parts.push(`<h2 ${SECTION_HEADING_STYLE}>Infrastructure</h2>`);
    parts.push(`<ul ${LIST_STYLE}>`);
    for (const i of checkedInfra) {
      parts.push(`<li ${LIST_ITEM_STYLE}>${escapeHtml(i.text)}</li>`);
    }
    parts.push(`</ul>`);
  }

  return parts.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ROW_HEIGHT_PX = 22;

/** Textarea that grows with content between minRows and maxRows. */
function AutoResizeTextarea({
  value,
  minRows = 2,
  maxRows = 12,
  className,
  ...props
}: React.ComponentProps<typeof Textarea> & { minRows?: number; maxRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minH = minRows * ROW_HEIGHT_PX;
  const maxH = maxRows * ROW_HEIGHT_PX;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const h = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${h}px`;
  }, [value, minH, maxH]);

  return (
    <Textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={`resize-none overflow-y-auto ${className ?? ""}`}
      style={{ minHeight: minH, maxHeight: maxH }}
      {...props}
    />
  );
}

/** Human-friendly date range for title/subject (e.g. "Mar 3-6, 2026" or "Feb 28 - Mar 6, 2026"). */
function formatWorklogDateRange(entries: WorklogEntry[]): string {
  if (entries.length === 0) return "";
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0].date + "T12:00:00Z");
  const last = new Date(sorted[sorted.length - 1].date + "T12:00:00Z");
  const optsShort: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  if (sorted.length === 1) {
    return first.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const firstStr = first.toLocaleDateString("en-US", optsShort);
  const lastStr = last.toLocaleDateString("en-US", optsShort);
  if (firstStr === lastStr) return firstStr;
  const sameMonth = first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear();
  if (sameMonth) {
    return `${first.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${first.getUTCDate()}-${last.getUTCDate()}, ${last.getUTCFullYear()}`;
  }
  return `${firstStr} – ${lastStr}`;
}

// --- Component ---

export function NewCommunicationForm({
  draft,
  worklogs,
  preselectedWorklog,
}: NewCommunicationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core form state
  const [draftId, setDraftId] = useState(draft?.id ?? null);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [sourceRef, setSourceRef] = useState(draft?.sourceReference ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.bodyHtml ?? "");
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Worklog-driven state
  const [selectedWorklogs, setSelectedWorklogs] = useState<WorklogWithStatus[]>([]);
  const [overview, setOverview] = useState("");
  const [features, setFeatures] = useState<CheckedFeature[]>([]);
  const [bugFixes, setBugFixes] = useState<CheckedItem[]>([]);
  const [infrastructure, setInfrastructure] = useState<CheckedItem[]>([]);
  const [isWorklogMode, setIsWorklogMode] = useState(false);
  const [showAddWorklogPicker, setShowAddWorklogPicker] = useState(false);
  const [overviewMode, setOverviewMode] = useState<"manual" | "dynamic">("manual");

  // Step management
  const initialStep: Step = draft ? "compose" : "select";
  const [step, setStep] = useState<Step>(initialStep);

  // Auto-select worklog from query param
  useEffect(() => {
    if (preselectedWorklog && !draft && step === "select") {
      const match = worklogs.find((w) => w.filename === preselectedWorklog);
      if (match) {
        handleSelectWorklog(match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track whether we're doing the initial draft load so we don't overwrite saved edits
  const isInitialDraftLoad = useRef(!!draft);

  // If loading an existing draft that has a source_reference matching worklog(s),
  // populate the structured state so the user can use checkboxes and refresh,
  // but preserve the draft's saved title, subject, and body.
  useEffect(() => {
    if (draft?.sourceReference && step === "compose") {
      const refs = draft.sourceReference.split("|").map((r) => r.trim()).filter(Boolean);
      const matched = refs
        .map((ref) => ref.replace(/^worklog\//, ""))
        .map((filename) => worklogs.find((w) => w.filename === filename))
        .filter((w): w is WorklogWithStatus => w != null);
      if (matched.length > 0) {
        setSelectedWorklogs(matched);
        setIsWorklogMode(true);
        populateFromWorklogs(matched);
        // Restore the draft's saved values (populateFromWorklogs just overwrote them)
        setTitle(draft.title);
        setSubject(draft.subject);
        setBody(draft.bodyHtml);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function populateFromWorklog(w: WorklogEntry) {
    setOverview(w.overviewParagraph);
    setFeatures(
      w.features.map((f) => ({ ...f, checked: true, adminOnly: isAdminOnlyItem(f.name, f.description) }))
    );
    setBugFixes(
      w.bugFixes.map((text) => ({ text, checked: true, adminOnly: isAdminOnlyItem(text) }))
    );
    setInfrastructure(
      w.infrastructure.map((text) => ({ text, checked: false, adminOnly: isAdminOnlyItem(text) }))
    );
  }

  /** Merge multiple worklogs: concat overviews, dedupe features/bugs/infra by name or text. */
  function populateFromWorklogs(ws: WorklogEntry[]) {
    const sorted = [...ws].sort((a, b) => a.date.localeCompare(b.date));
    const overviewParts = sorted.map((w) => w.overviewParagraph.trim()).filter(Boolean);
    setOverview(overviewParts.join("\n\n"));

    const seenFeatures = new Set<string>();
    const mergedFeatures: CheckedFeature[] = [];
    for (const w of sorted) {
      for (const f of w.features) {
        if (!seenFeatures.has(f.name)) {
          seenFeatures.add(f.name);
          mergedFeatures.push({ ...f, checked: true, adminOnly: isAdminOnlyItem(f.name, f.description) });
        }
      }
    }
    setFeatures(mergedFeatures);

    const seenBugs = new Set<string>();
    const mergedBugs: CheckedItem[] = [];
    for (const w of sorted) {
      for (const text of w.bugFixes) {
        if (!seenBugs.has(text)) {
          seenBugs.add(text);
          mergedBugs.push({ text, checked: true, adminOnly: isAdminOnlyItem(text) });
        }
      }
    }
    setBugFixes(mergedBugs);

    const seenInfra = new Set<string>();
    const mergedInfra: CheckedItem[] = [];
    for (const w of sorted) {
      for (const text of w.infrastructure) {
        if (!seenInfra.has(text)) {
          seenInfra.add(text);
          mergedInfra.push({ text, checked: false, adminOnly: isAdminOnlyItem(text) });
        }
      }
    }
    setInfrastructure(mergedInfra);

    const dateRange = formatWorklogDateRange(ws);
    setTitle(`${dateRange} Release`);
    setSubject(`What's new on Fanflet \u2014 ${dateRange}`);
  }

  function handleSelectWorklog(w: WorklogWithStatus) {
    setSelectedWorklogs([w]);
    setIsWorklogMode(true);
    populateFromWorklog(w);
    setTitle(`${w.dateLabel} Release`);
    setSubject(`What's new on Fanflet \u2014 ${w.dateLabel}`);
    setSourceRef(`worklog/${w.filename}`);
    setStep("compose");
  }

  function handleComposeFromScratch() {
    setIsWorklogMode(false);
    setSelectedWorklogs([]);
    setStep("compose");
  }

  function handleAddWorklog(w: WorklogWithStatus) {
    if (selectedWorklogs.some((x) => x.filename === w.filename)) return;
    const next = [...selectedWorklogs, w].sort((a, b) => a.date.localeCompare(b.date));

    const overviewParts = next.map((x) => x.overviewParagraph.trim()).filter(Boolean);
    setOverview(overviewParts.join("\n\n"));

    const existingFeatureNames = new Set(features.map((f) => f.name));
    const existingUncheckedFeatures = new Set(features.filter((f) => !f.checked).map((f) => f.name));
    const mergedFeatures: CheckedFeature[] = [...features];
    for (const f of w.features) {
      if (!existingFeatureNames.has(f.name)) {
        existingFeatureNames.add(f.name);
        mergedFeatures.push({
          ...f,
          checked: !existingUncheckedFeatures.has(f.name),
          adminOnly: isAdminOnlyItem(f.name, f.description),
        });
      }
    }
    setFeatures(mergedFeatures);

    const existingBugTexts = new Set(bugFixes.map((b) => b.text));
    const existingCheckedBugs = new Set(bugFixes.filter((b) => b.checked).map((b) => b.text));
    const mergedBugs: CheckedItem[] = [...bugFixes];
    for (const text of w.bugFixes) {
      if (!existingBugTexts.has(text)) {
        existingBugTexts.add(text);
        mergedBugs.push({ text, checked: true, adminOnly: isAdminOnlyItem(text) });
      }
    }
    setBugFixes(mergedBugs);

    const existingInfraTexts = new Set(infrastructure.map((i) => i.text));
    const existingCheckedInfra = new Set(infrastructure.filter((i) => i.checked).map((i) => i.text));
    const mergedInfra: CheckedItem[] = [...infrastructure];
    for (const text of w.infrastructure) {
      if (!existingInfraTexts.has(text)) {
        existingInfraTexts.add(text);
        mergedInfra.push({ text, checked: existingCheckedInfra.has(text), adminOnly: isAdminOnlyItem(text) });
      }
    }
    setInfrastructure(mergedInfra);

    setSourceRef(next.map((x) => `worklog/${x.filename}`).join("|"));
    setSelectedWorklogs(next);
    const dateRange = formatWorklogDateRange(next);
    setTitle(`${dateRange} Release`);
    setSubject(`What's new on Fanflet \u2014 ${dateRange}`);
    setShowAddWorklogPicker(false);
    toast.success("Added worklog to communication");
  }

  function handleRemoveWorklog(filename: string) {
    if (selectedWorklogs.length <= 1) return;
    const removed = worklogs.find((w) => w.filename === filename);
    if (!removed) return;
    const next = selectedWorklogs.filter((w) => w.filename !== filename);
    setSelectedWorklogs(next);
    setSourceRef(next.map((x) => `worklog/${x.filename}`).join("|"));

    // Strip only items unique to the removed worklog (keep if present in any remaining worklog)
    const inRemainingFeatures = new Set<string>();
    const inRemainingBugs = new Set<string>();
    const inRemainingInfra = new Set<string>();
    for (const w of next) {
      w.features.forEach((f) => inRemainingFeatures.add(f.name));
      w.bugFixes.forEach((t) => inRemainingBugs.add(t));
      w.infrastructure.forEach((t) => inRemainingInfra.add(t));
    }
    const uniqueToRemovedFeatures = new Set(removed.features.map((f) => f.name).filter((n) => !inRemainingFeatures.has(n)));
    const uniqueToRemovedBugs = new Set(removed.bugFixes.filter((t) => !inRemainingBugs.has(t)));
    const uniqueToRemovedInfra = new Set(removed.infrastructure.filter((t) => !inRemainingInfra.has(t)));

    setFeatures((prev) => prev.filter((f) => !uniqueToRemovedFeatures.has(f.name)));
    setBugFixes((prev) => prev.filter((b) => !uniqueToRemovedBugs.has(b.text)));
    setInfrastructure((prev) => prev.filter((i) => !uniqueToRemovedInfra.has(i.text)));

    const remainingOverviewParts = next.map((w) => w.overviewParagraph.trim()).filter(Boolean);
    setOverview(remainingOverviewParts.join("\n\n"));

    if (next.length > 0) {
      const dateRange = formatWorklogDateRange(next);
      setTitle(`${dateRange} Release`);
      setSubject(`What's new on Fanflet \u2014 ${dateRange}`);
    }
    setShowAddWorklogPicker(false);
    toast.success("Removed worklog from communication");
  }

  function handleRefreshFromWorklog() {
    if (selectedWorklogs.length === 0) return;
    const refFilenames = sourceRef.split("|").map((r) => r.replace(/^worklog\//, "").trim()).filter(Boolean);
    const latestList = refFilenames
      .map((fn) => worklogs.find((w) => w.filename === fn))
      .filter((w): w is WorklogWithStatus => w != null);
    if (latestList.length !== refFilenames.length) {
      toast.error("One or more worklogs not found in index");
      return;
    }

    const existingCheckedFeatures = new Set(features.filter((f) => f.checked).map((f) => f.name));
    const existingUncheckedFeatures = new Set(features.filter((f) => !f.checked).map((f) => f.name));
    const existingAdminOnlyFeatures = new Set(features.filter((f) => f.adminOnly).map((f) => f.name));
    const existingCheckedBugs = new Set(bugFixes.filter((b) => b.checked).map((b) => b.text));
    const existingCheckedInfra = new Set(infrastructure.filter((i) => i.checked).map((i) => i.text));
    const existingAdminOnlyBugs = new Set(bugFixes.filter((b) => b.adminOnly).map((b) => b.text));
    const existingAdminOnlyInfra = new Set(infrastructure.filter((i) => i.adminOnly).map((i) => i.text));

    const seenFeatures = new Set<string>();
    const newFeatures: CheckedFeature[] = [];
    for (const w of latestList) {
      for (const f of w.features) {
        if (!seenFeatures.has(f.name)) {
          seenFeatures.add(f.name);
          newFeatures.push({
            ...f,
            checked: existingUncheckedFeatures.has(f.name) ? false : true,
            adminOnly: existingAdminOnlyFeatures.has(f.name) || isAdminOnlyItem(f.name, f.description),
          });
        }
      }
    }
    const seenBugs = new Set<string>();
    const newBugFixes: CheckedItem[] = [];
    for (const w of latestList) {
      for (const text of w.bugFixes) {
        if (!seenBugs.has(text)) {
          seenBugs.add(text);
          newBugFixes.push({
            text,
            checked: existingCheckedBugs.has(text) || !existingCheckedBugs.size,
            adminOnly: existingAdminOnlyBugs.has(text) || isAdminOnlyItem(text),
          });
        }
      }
    }
    const seenInfra = new Set<string>();
    const newInfra: CheckedItem[] = [];
    for (const w of latestList) {
      for (const text of w.infrastructure) {
        if (!seenInfra.has(text)) {
          seenInfra.add(text);
          newInfra.push({
            text,
            checked: existingCheckedInfra.has(text),
            adminOnly: existingAdminOnlyInfra.has(text) || isAdminOnlyItem(text),
          });
        }
      }
    }
    const overviewParts = latestList.map((w) => w.overviewParagraph.trim()).filter(Boolean);

    setSelectedWorklogs(latestList);
    setOverview(overviewParts.join("\n\n"));
    setFeatures(newFeatures);
    setBugFixes(newBugFixes);
    setInfrastructure(newInfra);
    toast.success("Updated with latest worklog content");
  }

  // Speaker-facing: exclude admin-only items (they don't go in the email to speakers/sponsors)
  const speakerFeatures = useMemo(
    () => features.filter((f) => f.checked && !f.adminOnly),
    [features]
  );
  const speakerBugFixes = useMemo(
    () => bugFixes.filter((b) => b.checked && !b.adminOnly),
    [bugFixes]
  );
  const speakerInfrastructure = useMemo(
    () => infrastructure.filter((i) => i.checked && !i.adminOnly),
    [infrastructure]
  );

  // Dynamic overview: one paragraph from checked, speaker-facing item counts
  const dynamicOverview = useMemo(() => {
    const cf = speakerFeatures;
    const cb = speakerBugFixes;
    const ci = speakerInfrastructure;
    const parts: string[] = [];
    if (cf.length > 0) {
      if (cf.length === 1) {
        parts.push(`This release adds ${cf[0].name}.`);
      } else if (cf.length === 2) {
        parts.push(`This release adds ${cf[0].name} and ${cf[1].name}.`);
      } else if (cf.length === 3) {
        parts.push(`This release adds ${cf[0].name}, ${cf[1].name}, and ${cf[2].name}.`);
      } else {
        parts.push(`This release adds ${cf[0].name}, ${cf[1].name}, and ${cf.length - 2} more new features.`);
      }
    }
    if (cb.length > 0 || ci.length > 0) {
      const bits: string[] = [];
      if (cb.length > 0) bits.push(`${cb.length} bug fix${cb.length !== 1 ? "es" : ""}`);
      if (ci.length > 0) bits.push(`${ci.length} infrastructure update${ci.length !== 1 ? "s" : ""}`);
      parts.push(`We've also included ${bits.join(" and ")}.`);
    }
    if (parts.length === 0) return "Select items below to build the overview.";
    return parts.join(" ");
  }, [speakerFeatures, speakerBugFixes, speakerInfrastructure]);

  const effectiveOverview = overviewMode === "dynamic" ? dynamicOverview : overview;

  // Sync HTML body whenever structured content changes (worklog mode) — speaker-facing only
  const generatedHtml = useMemo(() => {
    if (!isWorklogMode) return null;
    return generateEmailHtml(
      effectiveOverview,
      speakerFeatures,
      speakerBugFixes,
      speakerInfrastructure
    );
  }, [isWorklogMode, effectiveOverview, speakerFeatures, speakerBugFixes, speakerInfrastructure]);

  useEffect(() => {
    if (generatedHtml !== null) {
      // Skip the first sync when loading an existing draft so saved edits aren't overwritten
      if (isInitialDraftLoad.current) {
        isInitialDraftLoad.current = false;
        return;
      }
      setBody(generatedHtml);
    }
  }, [generatedHtml]);

  // Toggle helpers
  const toggleFeature = useCallback((index: number) => {
    setFeatures((prev) =>
      prev.map((f, i) => (i === index ? { ...f, checked: !f.checked } : f))
    );
  }, []);

  const toggleBugFix = useCallback((index: number) => {
    setBugFixes((prev) =>
      prev.map((b, i) => (i === index ? { ...b, checked: !b.checked } : b))
    );
  }, []);

  const toggleInfrastructure = useCallback((index: number) => {
    setInfrastructure((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }, []);

  const toggleAllFeatures = useCallback((checked: boolean) => {
    setFeatures((prev) => prev.map((f) => ({ ...f, checked })));
  }, []);

  const toggleAllBugFixes = useCallback((checked: boolean) => {
    setBugFixes((prev) => prev.map((b) => ({ ...b, checked })));
  }, []);

  const toggleAllInfrastructure = useCallback((checked: boolean) => {
    setInfrastructure((prev) => prev.map((i) => ({ ...i, checked })));
  }, []);

  const updateFeature = useCallback((index: number, patch: { name?: string; description?: string }) => {
    setFeatures((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }, []);

  const updateBugFixText = useCallback((index: number, text: string) => {
    setBugFixes((prev) =>
      prev.map((b, i) => (i === index ? { ...b, text } : b))
    );
  }, []);

  const updateInfrastructureText = useCallback((index: number, text: string) => {
    setInfrastructure((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text } : item))
    );
  }, []);

  const setFeatureAdminOnly = useCallback((index: number, adminOnly: boolean) => {
    setFeatures((prev) =>
      prev.map((f, i) => (i === index ? { ...f, adminOnly } : f))
    );
  }, []);

  const setBugFixAdminOnly = useCallback((index: number, adminOnly: boolean) => {
    setBugFixes((prev) =>
      prev.map((b, i) => (i === index ? { ...b, adminOnly } : b))
    );
  }, []);

  const setInfrastructureAdminOnly = useCallback((index: number, adminOnly: boolean) => {
    setInfrastructure((prev) =>
      prev.map((item, i) => (i === index ? { ...item, adminOnly } : item))
    );
  }, []);

  const canSave = title.trim() && subject.trim() && body.trim();

  // --- Server action handlers ---

  function handleSaveDraft() {
    if (!canSave) return;
    startTransition(async () => {
      if (draftId) {
        const result = await updateDraft({
          id: draftId,
          title,
          subject,
          bodyHtml: body,
        });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Draft saved");
        }
      } else {
        const result = await createCommunication({
          title,
          sourceReference: sourceRef || undefined,
          subject,
          bodyHtml: body,
        });
        if (result.error) {
          toast.error(result.error);
        } else if (result.id) {
          setDraftId(result.id);
          toast.success("Draft created");
          router.replace(`/communications/new?draft=${result.id}`);
        }
      }
    });
  }

  function handlePreview() {
    if (!canSave) {
      toast.error("Fill in title, subject, and body first");
      return;
    }
    if (!draftId) {
      startTransition(async () => {
        const result = await createCommunication({
          title,
          sourceReference: sourceRef || undefined,
          subject,
          bodyHtml: body,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.id) {
          setDraftId(result.id);
          setStep("preview");
        }
      });
    } else {
      startTransition(async () => {
        await updateDraft({ id: draftId, title, subject, bodyHtml: body });
        setStep("preview");
      });
    }
  }

  function handleSendTest() {
    if (!draftId) return;
    setSendingTest(true);
    startTransition(async () => {
      const result = await sendTestEmail(draftId);
      setSendingTest(false);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
      }
    });
  }

  function handleSend() {
    if (!draftId) return;
    setSending(true);
    startTransition(async () => {
      const result = await sendCommunication(draftId);
      setSending(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Sent to ${result.sentCount} speaker${result.sentCount !== 1 ? "s" : ""}`
        );
        router.push(`/communications/${draftId}`);
      }
    });
  }

  function handleDelete() {
    if (!draftId) return;
    if (!confirm("Delete this draft?")) return;
    startTransition(async () => {
      const result = await deleteDraft(draftId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Draft deleted");
        router.push("/communications");
      }
    });
  }

  // ==================== STEP 1: Source Selection ====================
  if (step === "select") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/communications">
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>

        {worklogs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-fg">
                Start from a recent worklog
              </h2>
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {worklogs.slice(0, 6).map((w) => (
                <button
                  key={w.filename}
                  onClick={() => handleSelectWorklog(w)}
                  className="bg-surface rounded-lg border border-border-subtle p-4 text-left hover:border-primary/40 hover:bg-surface-elevated transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-[12px] text-fg-muted">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {w.dateLabel}
                    </div>
                    {w.commStatus === "sent" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-success/10 text-success">
                        <CheckIcon className="w-3 h-3" />
                        Sent
                      </span>
                    )}
                    {w.commStatus === "draft" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-elevated text-fg-muted">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-fg mb-1.5 line-clamp-1">
                    {w.titleSummary}
                  </p>
                  <p className="text-[11px] text-fg-muted line-clamp-2 mb-3">
                    {w.overviewParagraph}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                    {w.features.length > 0 && (
                      <span>
                        {w.features.length} feature{w.features.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {w.bugFixes.length > 0 && (
                      <span>
                        {w.bugFixes.length} fix{w.bugFixes.length !== 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[12px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Use this worklog &rarr;
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center text-[12px]">
            <span className="bg-surface-root px-3 text-fg-muted">or</span>
          </div>
        </div>

        <button
          onClick={handleComposeFromScratch}
          className="w-full bg-surface rounded-lg border border-border-subtle border-dashed p-5 text-center hover:border-primary/40 hover:bg-surface-elevated transition-all group"
        >
          <PenLineIcon className="w-5 h-5 text-fg-muted mx-auto mb-2 group-hover:text-primary transition-colors" />
          <p className="text-[13px] font-medium text-fg">Compose from scratch</p>
          <p className="text-[11px] text-fg-muted mt-0.5">
            Write your own announcement without a worklog source
          </p>
        </button>
      </div>
    );
  }

  // ==================== STEP 3: Preview & Send ====================
  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("compose")}>
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to edit
          </Button>
        </div>

        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="bg-[#1B365D] px-6 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://fanflet.com/logo.png"
                alt="Fanflet"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className="text-[18px] font-semibold text-white tracking-tight">
                Fanflet
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-[12px] font-medium text-fg-muted mb-1">Subject</p>
            <p className="text-[14px] text-fg mb-4">{subject}</p>
            <p className="text-[12px] font-medium text-fg-muted mb-1">Body</p>
            <div
              className="prose prose-sm max-w-none text-fg"
              dangerouslySetInnerHTML={{ __html: body }}
            />
            <div className="mt-8 pt-6 border-t border-border-subtle">
              <p className="text-[13px] text-fg-secondary">
                Have ideas or suggestions? Just reply to this email &mdash; we read every response.
              </p>
            </div>
          </div>
          <div className="px-6 py-3 border-t border-border-subtle text-center">
            <p className="text-[11px] text-fg-muted">
              You&apos;re receiving this because you opted in to platform announcements.
            </p>
            <p className="text-[11px] text-fg-muted">
              Manage preferences &middot; Unsubscribe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleSendTest}
            variant="outline"
            disabled={sendingTest || isPending}
          >
            {sendingTest ? (
              <Loader2Icon className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <FlaskConicalIcon className="w-4 h-4 mr-1.5" />
            )}
            Send test to me
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || isPending}
            className="bg-[#1B365D] hover:bg-[#1B365D]/90"
          >
            {sending ? (
              <Loader2Icon className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4 mr-1.5" />
            )}
            Send to speakers
          </Button>
        </div>
      </div>
    );
  }

  // ==================== STEP 2: Compose ====================

  const checkedFeatureCount = features.filter((f) => f.checked).length;
  const checkedBugCount = bugFixes.filter((b) => b.checked).length;
  const checkedInfraCount = infrastructure.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {draft ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/communications">
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            {isWorklogMode ? "Change source" : "Back"}
          </Button>
        )}
      </div>

      {/* Source indicator: chips per worklog + refresh + add another */}
      {isWorklogMode && selectedWorklogs.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/5 rounded-lg px-4 py-3 border border-primary/10">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <FileTextIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[12px] text-fg-secondary shrink-0">Source:</span>
              {selectedWorklogs.map((w) => (
                <span
                  key={w.filename}
                  className="inline-flex items-center gap-1.5 rounded-md bg-surface border border-border-subtle px-2.5 py-1 text-[12px] text-fg"
                >
                  <span className="truncate max-w-[180px]">
                    {w.dateLabel} — {w.titleSummary}
                  </span>
                  {selectedWorklogs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWorklog(w.filename)}
                      className="shrink-0 rounded p-0.5 text-fg-muted hover:bg-surface-elevated hover:text-fg"
                      aria-label={`Remove ${w.filename}`}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshFromWorklog}
              className="shrink-0 text-[12px] text-primary hover:text-primary"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 mr-1" />
              Refresh from worklog
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddWorklogPicker((v) => !v)}
              className="text-[12px]"
            >
              <PlusIcon className="w-3.5 h-3.5 mr-1" />
              Add another worklog
            </Button>
            {showAddWorklogPicker && (
              <span className="text-[11px] text-fg-muted">Pick one below to merge into this communication</span>
            )}
          </div>
          {showAddWorklogPicker && (
            <div className="rounded-lg border border-border-subtle bg-surface-elevated/50 max-h-48 overflow-y-auto">
              {worklogs
                .filter((w) => !selectedWorklogs.some((s) => s.filename === w.filename))
                .slice(0, 8)
                .map((w) => (
                  <div
                    key={w.filename}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 border-b border-border-subtle last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleAddWorklog(w)}
                      className="flex-1 min-w-0 text-left hover:bg-surface transition-colors rounded -mx-1 px-1 py-0.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-fg truncate">
                          {w.dateLabel} — {w.titleSummary}
                        </p>
                        <p className="text-[11px] text-fg-muted">
                          {w.features.length} feature{w.features.length !== 1 ? "s" : ""}
                          {w.bugFixes.length > 0 &&
                            ` · ${w.bugFixes.length} fix${w.bugFixes.length !== 1 ? "es" : ""}`}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-primary"
                        onClick={() => handleAddWorklog(w)}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-fg-muted hover:text-fg"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const { error } = await archiveWorklog(w.filename);
                          if (error) toast.error(error);
                          else {
                            toast.success("Worklog archived");
                            router.refresh();
                          }
                        }}
                        aria-label={`Archive ${w.filename}`}
                      >
                        <ArchiveIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              {worklogs.filter((w) => !selectedWorklogs.some((s) => s.filename === w.filename)).length === 0 && (
                <p className="px-4 py-3 text-[12px] text-fg-muted">All worklogs are already included.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: form controls */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-surface rounded-lg border border-border-subtle p-5 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[13px] font-medium text-fg">
                Title
              </Label>
              <Input
                id="title"
                placeholder="e.g. March 2026 Release Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-[11px] text-fg-muted">
                Internal title for your reference (not sent to recipients).
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-[13px] font-medium text-fg">
                Email subject
              </Label>
              <Input
                id="subject"
                placeholder="e.g. What's new on Fanflet — March 2026"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Worklog-mode: structured content curation */}
          {isWorklogMode ? (
            <div className="space-y-4">
              <p className="text-[11px] text-fg-muted">
                Admin-related items (e.g. impersonation, audit log) are auto-flagged as <strong>Admin only</strong> and excluded from the speaker email. You can change any item if needed.
              </p>
              {/* Overview */}
              <div className="bg-surface rounded-lg border border-border-subtle p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-[13px] font-medium text-fg">
                    Overview paragraph
                  </Label>
                  <div className="flex rounded-md border border-border-subtle p-0.5 bg-surface-elevated/50">
                    <button
                      type="button"
                      onClick={() => setOverviewMode("dynamic")}
                      className={`rounded px-2.5 py-1 text-[12px] transition-colors ${
                        overviewMode === "dynamic"
                          ? "bg-surface text-fg font-medium shadow-sm"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      Auto from selections
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (overviewMode === "dynamic") setOverview(dynamicOverview);
                        setOverviewMode("manual");
                      }}
                      className={`rounded px-2.5 py-1 text-[12px] transition-colors ${
                        overviewMode === "manual"
                          ? "bg-surface text-fg font-medium shadow-sm"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      Edit manually
                    </button>
                  </div>
                </div>
                {overviewMode === "dynamic" ? (
                  <div className="rounded-md border border-border-subtle bg-surface-elevated/30 px-3 py-2.5">
                    <p className="text-[13px] text-fg whitespace-pre-wrap">
                      {dynamicOverview}
                    </p>
                    <p className="text-[11px] text-fg-muted mt-1.5">
                      Updates automatically when you check or uncheck items below.
                    </p>
                  </div>
                ) : (
                  <AutoResizeTextarea
                    value={overview}
                    onChange={(e) => setOverview(e.target.value)}
                    minRows={4}
                    maxRows={16}
                    className="text-[13px]"
                    placeholder="Executive summary of the release..."
                  />
                )}
              </div>

              {/* Features */}
              {features.length > 0 && (
                <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-fg">
                      New Features
                      <span className="font-normal text-fg-muted ml-1.5">
                        ({checkedFeatureCount}/{features.length})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllFeatures(true)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        All
                      </button>
                      <span className="text-fg-muted text-[11px]">/</span>
                      <button
                        onClick={() => toggleAllFeatures(false)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {features.map((f, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                          f.checked
                            ? "bg-surface"
                            : "bg-surface-elevated/50 opacity-60"
                        } hover:bg-surface-elevated`}
                      >
                        <input
                          type="checkbox"
                          checked={f.checked}
                          onChange={() => toggleFeature(i)}
                          className="mt-1.5 rounded border-border-subtle text-primary focus:ring-primary/20 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Input
                            value={f.name}
                            onChange={(e) => updateFeature(i, { name: e.target.value })}
                            className="text-[13px] font-medium h-8"
                            placeholder="Feature name"
                          />
                          <AutoResizeTextarea
                            value={f.description}
                            onChange={(e) => updateFeature(i, { description: e.target.value })}
                            minRows={2}
                            maxRows={10}
                            className="text-[12px] text-fg-muted flex-1 min-w-0"
                            placeholder="Description"
                          />
                        </div>
                        <label className="flex shrink-0 items-center gap-1.5 pt-1 text-[11px] text-fg-muted cursor-pointer" title="Exclude from speaker/sponsor email">
                          <input
                            type="checkbox"
                            checked={!!f.adminOnly}
                            onChange={(e) => setFeatureAdminOnly(i, e.target.checked)}
                            className="rounded border-border-subtle text-primary focus:ring-primary/20"
                          />
                          <span>Admin only</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bug Fixes */}
              {bugFixes.length > 0 && (
                <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-fg">
                      Bug Fixes
                      <span className="font-normal text-fg-muted ml-1.5">
                        ({checkedBugCount}/{bugFixes.length})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllBugFixes(true)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        All
                      </button>
                      <span className="text-fg-muted text-[11px]">/</span>
                      <button
                        onClick={() => toggleAllBugFixes(false)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {bugFixes.map((b, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                          b.checked
                            ? "bg-surface"
                            : "bg-surface-elevated/50 opacity-60"
                        } hover:bg-surface-elevated`}
                      >
                        <input
                          type="checkbox"
                          checked={b.checked}
                          onChange={() => toggleBugFix(i)}
                          className="mt-2 rounded border-border-subtle text-primary focus:ring-primary/20 shrink-0"
                        />
                        <AutoResizeTextarea
                          value={b.text}
                          onChange={(e) => updateBugFixText(i, e.target.value)}
                          minRows={2}
                          maxRows={8}
                          className="text-[13px] flex-1 min-w-0 py-1.5"
                          placeholder="Bug fix description"
                        />
                        <label className="flex shrink-0 items-center gap-1.5 pt-1 text-[11px] text-fg-muted cursor-pointer" title="Exclude from speaker/sponsor email">
                          <input
                            type="checkbox"
                            checked={!!b.adminOnly}
                            onChange={(e) => setBugFixAdminOnly(i, e.target.checked)}
                            className="rounded border-border-subtle text-primary focus:ring-primary/20"
                          />
                          <span>Admin only</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Infrastructure (unchecked by default) */}
              {infrastructure.length > 0 && (
                <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-fg">
                      Infrastructure
                      <span className="font-normal text-fg-muted ml-1.5">
                        ({checkedInfraCount}/{infrastructure.length})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllInfrastructure(true)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        All
                      </button>
                      <span className="text-fg-muted text-[11px]">/</span>
                      <button
                        onClick={() => toggleAllInfrastructure(false)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {infrastructure.map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                          item.checked
                            ? "bg-surface"
                            : "bg-surface-elevated/50 opacity-60"
                        } hover:bg-surface-elevated`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleInfrastructure(i)}
                          className="mt-2 rounded border-border-subtle text-primary focus:ring-primary/20 shrink-0"
                        />
                        <AutoResizeTextarea
                          value={item.text}
                          onChange={(e) => updateInfrastructureText(i, e.target.value)}
                          minRows={2}
                          maxRows={8}
                          className="text-[13px] flex-1 min-w-0 py-1.5"
                          placeholder="Infrastructure item"
                        />
                        <label className="flex shrink-0 items-center gap-1.5 pt-1 text-[11px] text-fg-muted cursor-pointer" title="Exclude from speaker/sponsor email">
                          <input
                            type="checkbox"
                            checked={!!item.adminOnly}
                            onChange={(e) => setInfrastructureAdminOnly(i, e.target.checked)}
                            className="rounded border-border-subtle text-primary focus:ring-primary/20"
                          />
                          <span>Admin only</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-2 bg-surface-elevated/30">
                    <p className="text-[11px] text-fg-muted italic">
                      Infrastructure items are unchecked by default &mdash; speakers typically
                      don&apos;t need these details.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Scratch mode: plain textarea */
            <div className="bg-surface rounded-lg border border-border-subtle p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="source" className="text-[13px] font-medium text-fg">
                  Source reference{" "}
                  <span className="text-fg-muted">(optional)</span>
                </Label>
                <Input
                  id="source"
                  placeholder="e.g. worklog/260306 Impersonation Emails Analytics"
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body" className="text-[13px] font-medium text-fg">
                  Email body{" "}
                  <span className="text-fg-muted">(HTML or plain text)</span>
                </Label>
                <Textarea
                  id="body"
                  placeholder={
                    "Paste your Release Summary content here...\n\nHTML is supported. Wrap paragraphs in <p> tags for best results."
                  }
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={16}
                  className="font-mono text-[13px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right column: live preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-[12px] font-medium text-fg-muted uppercase tracking-wider mb-2">
              Live Preview
            </p>
            <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden text-[12px]">
              <div className="bg-[#1B365D] px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://fanflet.com/logo.png"
                    alt="Fanflet"
                    width={16}
                    height={16}
                    className="rounded"
                  />
                  <span className="text-[11px] font-semibold text-white">
                    Fanflet
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-white truncate">
                  {title || "Title"}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] text-fg-muted mb-0.5">Subject</p>
                <p className="text-[11px] text-fg mb-3">
                  {subject || "Subject line"}
                </p>
                <div
                  className="prose prose-xs max-w-none text-fg [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:text-[#1B365D] [&_h2]:mt-3 [&_h2]:mb-1 [&_p]:text-[11px] [&_p]:mb-1.5 [&_p]:leading-relaxed [&_ul]:text-[11px] [&_ul]:pl-4 [&_ul]:mb-2 [&_li]:mb-1 [&_li]:leading-relaxed [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{
                    __html:
                      body ||
                      '<p style="color:#94a3b8">Email content will appear here...</p>',
                  }}
                />
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <p className="text-[10px] text-fg-muted">
                    Have ideas or suggestions? Just reply to this email.
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-border-subtle text-center">
                <p className="text-[9px] text-fg-muted">
                  Manage preferences &middot; Unsubscribe
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          disabled={!canSave || isPending}
        >
          {isPending ? (
            <Loader2Icon className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <SaveIcon className="w-4 h-4 mr-1.5" />
          )}
          {draftId ? "Save draft" : "Create draft"}
        </Button>
        <Button onClick={handlePreview} disabled={!canSave || isPending}>
          <EyeIcon className="w-4 h-4 mr-1.5" />
          Preview & send
        </Button>
        {draftId && (
          <Button
            onClick={handleDelete}
            variant="ghost"
            className="text-error hover:text-error ml-auto"
            disabled={isPending}
          >
            <TrashIcon className="w-4 h-4 mr-1.5" />
            Delete draft
          </Button>
        )}
      </div>
    </div>
  );
}
