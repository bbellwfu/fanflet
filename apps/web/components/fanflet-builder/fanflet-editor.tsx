"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  QrCode,
  Loader2,
  MessageSquare,
  FileText,
  Palette,
  LayoutGrid,
  Users,
  Mail,
} from "lucide-react";
import {
  updateFanfletDetails,
  publishFanflet,
  unpublishFanflet,
  deleteResourceBlock,
} from "@/app/dashboard/fanflets/[id]/actions";
import { toast } from "sonner";
import { ResourceBlockCard } from "./resource-block-card";
import { AddBlockForm } from "./add-block-form";
import { ThemePicker } from "./theme-picker";
import { resolveThemeId, DEFAULT_THEME_ID } from "@/lib/themes";
import {
  type ExpirationPreset,
  EXPIRATION_PRESETS,
  FREE_TIER_EXPIRATION_PRESETS,
  computeExpirationDate,
  todayUtcDateOnly,
} from "@/lib/expiration";
import { formatDateLong } from "@fanflet/db/timezone";
import { useTimezone } from "@/lib/timezone-context";

type ConfirmationEmailConfig = {
  enabled?: boolean;
  subject?: string;
  body?: string;
} | null;

type Fanflet = {
  id: string;
  title: string;
  description: string | null;
  event_name: string;
  event_date: string | null;
  show_event_name: boolean;
  slug: string;
  status: string;
  survey_question_id: string | null;
  survey_question_ids: string[];
  theme_config: Record<string, unknown> | null;
  expiration_date: string | null;
  expiration_preset: string;
  show_expiration_notice: boolean;
  published_at: string | null;
  confirmation_email_config?: ConfirmationEmailConfig;
};

type SurveyQuestion = {
  id: string;
  question_text: string;
  question_type: string;
};

type ResourceBlock = {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  file_path: string | null;
  image_url: string | null;
  display_order: number;
  section_name: string | null;
  metadata: Record<string, unknown> | null;
  library_item_id: string | null;
  resource_library?: { file_path: string | null; file_type: string | null; file_size_bytes?: number | null } | null;
};

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  image_url: string | null;
  section_name: string | null;
  metadata: Record<string, unknown> | null;
};

interface FanfletEditorProps {
  fanflet: Fanflet;
  resourceBlocks: ResourceBlock[];
  speakerSlug: string | null;
  publicUrl: string | null;
  hasSpeakerSlug: boolean;
  authUserId: string;
  surveyQuestions?: SurveyQuestion[];
  libraryItems?: LibraryItem[];
  /** When false, only the base theme is selectable (free tier). */
  allowMultipleThemes?: boolean;
  /** When false, hide or disable feedback/survey section. */
  hasSurveys?: boolean;
  /** When false, only 14d and none expiration options. */
  allowCustomExpiration?: boolean;
  /** When false, hide sponsor block type. */
  allowSponsorVisibility?: boolean;
  /** When true, show link to sponsor report page. */
  hasSponsorReports?: boolean;
  /** Active sponsor connections for linking sponsor blocks. */
  connectedSponsors?: { id: string; company_name: string }[];
  /** Ended sponsor connections (for "Connection ended on [date]" and optional Unlink). */
  endedSponsors?: { id: string; company_name: string; ended_at: string }[];
}

/** Shown when a block's library source was deleted. No edit UI — only remove to avoid error-prone state. */
function OrphanedBlockCard({
  blockId,
  fanfletId,
  onRemoved,
}: {
  blockId: string;
  fanfletId: string;
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Remove this block from the fanflet? It can't be restored.")) return;
    setRemoving(true);
    const result = await deleteResourceBlock(blockId);
    setRemoving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Block removed");
    onRemoved();
    router.refresh();
  };

  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex flex-row items-center justify-between gap-4 py-4">
        <p className="text-sm text-amber-900">
          This block&apos;s library source was deleted. Remove it to keep the fanflet valid.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemove}
          disabled={removing}
          className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove block"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function FanfletEditor({
  fanflet,
  resourceBlocks,
  speakerSlug,
  publicUrl,
  hasSpeakerSlug,
  authUserId,
  surveyQuestions = [],
  libraryItems = [],
  allowMultipleThemes = true,
  hasSurveys = true,
  allowCustomExpiration = true,
  allowSponsorVisibility = true,
  hasSponsorReports = false,
  connectedSponsors = [],
  endedSponsors = [],
}: FanfletEditorProps) {
  const router = useRouter();
  const timezone = useTimezone();
  const [saving, setSaving] = useState(false);
  const [showSlugWarning, setShowSlugWarning] = useState(false);
  const surveySelectMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [title, setTitle] = useState(fanflet.title);
  const [description, setDescription] = useState(fanflet.description ?? "");
  const [eventName, setEventName] = useState(fanflet.event_name);
  const [showEventName, setShowEventName] = useState(fanflet.show_event_name !== false);
  const [eventDate, setEventDate] = useState(
    fanflet.event_date ? fanflet.event_date.slice(0, 10) : ""
  );
  const [slug, setSlug] = useState(fanflet.slug);
  const [surveyQuestionIds, setSurveyQuestionIds] = useState<string[]>(
    fanflet.survey_question_ids?.length
      ? fanflet.survey_question_ids
      : fanflet.survey_question_id
        ? [fanflet.survey_question_id]
        : []
  );
  const [selectedThemeId, setSelectedThemeId] = useState(
    resolveThemeId(fanflet.theme_config)
  );
  const rawPreset = (fanflet.expiration_preset as ExpirationPreset) || "none";
  const [expirationPreset, setExpirationPreset] = useState<ExpirationPreset>(
    !allowCustomExpiration && rawPreset !== "none" && rawPreset !== "14d"
      ? "14d"
      : rawPreset
  );
  const [expirationCustomDate, setExpirationCustomDate] = useState(
    fanflet.expiration_date ? fanflet.expiration_date.slice(0, 10) : ""
  );
  const [showExpirationNotice, setShowExpirationNotice] = useState(
    fanflet.show_expiration_notice ?? true
  );
  const [activeShortcutId, setActiveShortcutId] = useState("fanflet-details-section");

  // Subscriber confirmation email override
  const [showEmailModal, setShowEmailModal] = useState(false);
  const initialEmailConfig = fanflet.confirmation_email_config;
  const [emailOverrideEnabled, setEmailOverrideEnabled] = useState(
    initialEmailConfig != null && typeof initialEmailConfig.enabled === "boolean"
  );
  const [emailOverrideBody, setEmailOverrideBody] = useState(
    initialEmailConfig?.body ?? ""
  );
  const hasEmailOverride =
    initialEmailConfig != null && typeof initialEmailConfig.enabled === "boolean";

  const referenceDate = fanflet.published_at
    ? new Date(fanflet.published_at)
    : new Date();
  const today = todayUtcDateOnly();
  const presetWouldBePast = (preset: "14d" | "30d" | "60d" | "90d") => {
    const exp = computeExpirationDate(preset, null, referenceDate);
    return exp ? exp < today : false;
  };
  const computedExpirationDate =
    expirationPreset !== "none"
      ? computeExpirationDate(
          expirationPreset,
          expirationPreset === "custom" ? expirationCustomDate || null : null,
          referenceDate
        )
      : null;

  const slugChanged = slug !== fanflet.slug;

  const scrollToSection = (sectionId: string) => {
    setActiveShortcutId(sectionId);
    const section = document.getElementById(sectionId);
    if (!section) return;

    const top = section.getBoundingClientRect().top + window.scrollY - 190;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const sectionIds = [
      "fanflet-details-section",
      "fanflet-theme-section",
      "fanflet-feedback-section",
      "fanflet-resource-blocks-section",
    ];

    const updateActiveSection = () => {
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 220) {
          current = id;
        }
      }
      setActiveShortcutId(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const handleSaveClick = () => {
    if (slugChanged && fanflet.status === "published") {
      setShowSlugWarning(true);
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    setSaving(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("event_name", eventName);
    formData.set("show_event_name", showEventName ? "true" : "false");
    formData.set("event_date", eventDate || "");
    formData.set("slug", slug);
    formData.set("survey_question_ids", JSON.stringify(surveyQuestionIds));
    formData.set(
      "theme_config",
      JSON.stringify(
        selectedThemeId === DEFAULT_THEME_ID
          ? {}
          : { preset: selectedThemeId }
      )
    );
    formData.set("expiration_preset", expirationPreset);
    formData.set(
      "expiration_custom_date",
      expirationPreset === "custom" ? expirationCustomDate : ""
    );
    formData.set("show_expiration_notice", showExpirationNotice ? "true" : "false");

    const result = await updateFanfletDetails(fanflet.id, formData);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (slugChanged) {
      toast.success("Slug updated — a new QR code has been generated");
    } else {
      toast.success("Details saved");
    }
    router.refresh();
  };

  const handlePublish = async () => {
    if (!hasSpeakerSlug) {
      toast.error(
        "Please set your Speaker URL in Settings before publishing."
      );
      return;
    }
    const result = await publishFanflet(fanflet.id);
    if (result.error) toast.error(result.error);
    else {
      if (result.firstPublished) {
        toast.success("Huge win! Your first Fanflet is live and QR-ready.");
      } else {
        toast.success("Fanflet published!");
      }
      router.refresh();
    }
  };

  const handleUnpublish = async () => {
    const result = await unpublishFanflet(fanflet.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Fanflet unpublished");
      router.refresh();
    }
  };

  const statusBadge =
    fanflet.status === "published" ? (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
        Live
      </span>
    ) : fanflet.status === "archived" ? (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
        Archived
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-600">
        Draft
      </span>
    );

  return (
    <div className="w-full pb-20">
      {/* Sticky header bar */}
      <div className="sticky top-16 md:top-0 z-30 bg-slate-50 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-2 pb-4 border-b border-slate-200/80">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Link href="/dashboard/fanflets">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">
                {fanflet.title}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {fanflet.event_name}
              </p>
            </div>
            {statusBadge}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mt-3">
            <div className="flex flex-wrap items-center gap-2">
              {fanflet.status === "published" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnpublish}
                >
                  Unpublish
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/fanflets/${fanflet.id}/preview`} target="_blank">
                  <Eye className="w-4 h-4" />
                  Preview
                </Link>
              </Button>
              {fanflet.status === "published" && publicUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`${publicUrl}?preview`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    View Live
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/fanflets/${fanflet.id}/qr`}>
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">QR Code</span>
                  <span className="sm:hidden">QR</span>
                </Link>
              </Button>
              {hasSponsorReports && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/fanflets/${fanflet.id}/sponsors`}>
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Sponsor report</span>
                    <span className="sm:hidden">Sponsors</span>
                  </Link>
                </Button>
              )}
            </div>
            <div className="hidden sm:block sm:flex-1" />
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 shrink-0">
              Shortcuts
            </span>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 p-1 shadow-sm overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => scrollToSection("fanflet-details-section")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeShortcutId === "fanflet-details-section"
                    ? "bg-[#1B365D] text-white shadow-sm ring-1 ring-[#1B365D]/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                Details
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("fanflet-theme-section")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeShortcutId === "fanflet-theme-section"
                    ? "bg-[#1B365D] text-white shadow-sm ring-1 ring-[#1B365D]/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Palette className="h-3.5 w-3.5 shrink-0" />
                Theme
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("fanflet-feedback-section")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeShortcutId === "fanflet-feedback-section"
                    ? "bg-[#1B365D] text-white shadow-sm ring-1 ring-[#1B365D]/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                Feedback
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("fanflet-resource-blocks-section")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeShortcutId === "fanflet-resource-blocks-section"
                    ? "bg-[#1B365D] text-white shadow-sm ring-1 ring-[#1B365D]/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                Resources
              </button>
            </div>
          </div>
        </div>
      </div>

      {!hasSpeakerSlug && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mt-6">
          Set your Speaker URL in{" "}
          <Link
            href="/dashboard/settings"
            className="font-medium underline hover:no-underline"
          >
            Settings
          </Link>{" "}
          before publishing so your Fanflet has a public URL.
        </div>
      )}

      <div className="space-y-8 mt-6 pb-24 md:pb-0">

      {/* Details section */}
      <Card id="fanflet-details-section" className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#1B365D]">Details</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Talk title"
                  className="border-[#e2e8f0]"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Presentation Description{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief summary of your talk — what the audience will learn, key takeaways, etc."
                  rows={3}
                  className="border-[#e2e8f0]"
                />
              </div>
              <div className="space-y-2">
                <Label>Event Name or Purpose</Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="border-[#e2e8f0]"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_event_name"
                    checked={showEventName}
                    onChange={(e) => setShowEventName(e.target.checked)}
                    className="h-4 w-4 rounded border-[#e2e8f0]"
                  />
                  <Label htmlFor="show_event_name" className="text-sm font-normal cursor-pointer">
                    Display event name on Fanflet page
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="border-[#e2e8f0] max-w-[200px]"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-sm text-muted-foreground">
                    fanflet.com/{speakerSlug || "your-slug"}/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="talk-slug"
                    className="border-[#e2e8f0] font-mono sm:flex-1"
                  />
                </div>
                {slugChanged && fanflet.status === "published" && (
                  <p className="text-xs text-amber-600">
                    Changing the slug will invalidate any previously shared QR codes and links.
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <Label className="text-[#1B365D]">Content expiration</Label>
                <p className="text-sm text-muted-foreground">
                  Limit how long this Fanflet is publicly available. Presets are from{" "}
                  {fanflet.published_at
                    ? "first publish date"
                    : "when you publish"}
                  .
                </p>
                <div className="flex flex-wrap gap-2">
                  {(allowCustomExpiration ? EXPIRATION_PRESETS : FREE_TIER_EXPIRATION_PRESETS).map((preset) => {
                    const isPast = (preset === "14d" || preset === "30d" || preset === "60d" || preset === "90d") && presetWouldBePast(preset);
                    return (
                      <Button
                        key={preset}
                        type="button"
                        variant={expirationPreset === preset ? "default" : "outline"}
                        size="sm"
                        disabled={isPast}
                        className={
                          expirationPreset === preset
                            ? "bg-[#1B365D] hover:bg-[#152b4d]"
                            : "border-[#e2e8f0]"
                        }
                        onClick={() => !isPast && setExpirationPreset(preset)}
                      >
                        {preset === "none"
                          ? "Doesn't expire"
                          : preset === "custom"
                            ? "Custom date"
                            : `${preset === "14d" ? "14" : preset === "30d" ? "30" : preset === "60d" ? "60" : "90"} days`}
                      </Button>
                    );
                  })}
                </div>
                {expirationPreset === "custom" && allowCustomExpiration && (
                  <div className="space-y-1">
                    <Label htmlFor="expiration_custom_date_edit" className="text-sm">
                      Expiration date
                    </Label>
                    <Input
                      id="expiration_custom_date_edit"
                      type="date"
                      value={expirationCustomDate}
                      onChange={(e) => setExpirationCustomDate(e.target.value)}
                      className="border-[#e2e8f0] max-w-[200px]"
                    />
                  </div>
                )}
                {computedExpirationDate && (
                  <p className="text-sm text-muted-foreground">
                    Expires on{" "}
                    {formatDateLong(computedExpirationDate + "T12:00:00Z", timezone)}
                    .
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_expiration_notice_edit"
                    checked={showExpirationNotice}
                    onChange={(e) => setShowExpirationNotice(e.target.checked)}
                    className="h-4 w-4 rounded border-[#e2e8f0]"
                  />
                  <Label htmlFor="show_expiration_notice_edit" className="text-sm font-normal cursor-pointer">
                    Show &quot;This content available until [date]&quot; to visitors
                  </Label>
                </div>
              </div>

              {/* Subscriber Confirmation Email */}
              <div className="space-y-2 pt-4 mt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-[#1B365D]">
                      Subscriber Confirmation Email
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {hasEmailOverride ? "Custom message" : "Using default"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(true)}
                      className="text-xs text-[#3BA5D9] hover:text-[#1B365D] font-medium"
                    >
                      {hasEmailOverride ? "Edit" : "Customize"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  When someone subscribes, they receive a confirmation email with a link to this Fanflet.
                </p>
              </div>

              {/* Email Override Modal */}
              <AlertDialog open={showEmailModal} onOpenChange={setShowEmailModal}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Subscriber Confirmation Email</AlertDialogTitle>
                    <AlertDialogDescription>
                      Customize the confirmation email for this Fanflet, or use your default message from Settings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="email_override"
                          checked={!emailOverrideEnabled}
                          onChange={() => setEmailOverrideEnabled(false)}
                          className="h-4 w-4 border-slate-300 text-[#1B365D] focus:ring-[#3BA5D9]"
                        />
                        <span className="text-sm text-[#1B365D]">
                          Use default message (from Settings)
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="email_override"
                          checked={emailOverrideEnabled}
                          onChange={() => setEmailOverrideEnabled(true)}
                          className="h-4 w-4 border-slate-300 text-[#1B365D] focus:ring-[#3BA5D9]"
                        />
                        <span className="text-sm text-[#1B365D]">
                          Custom message for this Fanflet
                        </span>
                      </label>
                    </div>

                    {emailOverrideEnabled && (
                      <div className="space-y-2 pl-7">
                        <textarea
                          value={emailOverrideBody}
                          onChange={(e) => setEmailOverrideBody(e.target.value.slice(0, 500))}
                          placeholder="Thanks for attending! I hope these resources help you put what we discussed into practice."
                          maxLength={500}
                          rows={4}
                          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:border-[#3BA5D9] focus:outline-none focus:ring-1 focus:ring-[#3BA5D9]/30 resize-none"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>The link to this Fanflet is always included.</span>
                          <span>{emailOverrideBody.length}/500</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const { updateFanfletEmailConfig } = await import("@/app/dashboard/fanflets/[id]/actions");
                        const config = emailOverrideEnabled
                          ? { enabled: true, body: emailOverrideBody.trim() || undefined }
                          : null;
                        const result = await updateFanfletEmailConfig(fanflet.id, config);
                        if (result.error) {
                          toast.error(result.error);
                        } else {
                          toast.success("Email settings saved");
                          setShowEmailModal(false);
                          router.refresh();
                        }
                      }}
                      className="bg-[#1B365D] hover:bg-[#1B365D]/90 text-white"
                    >
                      Save
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Slug change confirmation dialog */}
              <AlertDialog open={showSlugWarning} onOpenChange={setShowSlugWarning}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Change URL Slug?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        You are changing the slug from <strong className="font-mono">{fanflet.slug}</strong> to <strong className="font-mono">{slug}</strong>.
                      </span>
                      <span className="block font-semibold text-red-600">
                        Any existing QR codes and shared links will stop working immediately.
                      </span>
                      <span className="block">
                        A new QR code will be generated automatically with the updated URL. You will need to redistribute it.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={performSave}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Yes, Update Slug
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
      </Card>

      {/* Theme */}
      <Card id="fanflet-theme-section" className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#1B365D]">Theme</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a color theme for your Fanflet landing page.
          </p>
        </CardHeader>
        <CardContent>
          <ThemePicker
            selectedThemeId={selectedThemeId}
            onChange={setSelectedThemeId}
            allowMultipleThemes={allowMultipleThemes}
            upgradeHref="/dashboard/settings#subscription"
          />
        </CardContent>
      </Card>

      {/* Feedback Questions */}
      <Card id="fanflet-feedback-section" className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#1B365D] flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback Questions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {hasSurveys
              ? "Add up to 3 quick feedback questions shown when visitors open this Fanflet."
              : "Upgrade your plan to add session feedback questions to your Fanflets."}
          </p>
        </CardHeader>
        <CardContent>
          {!hasSurveys ? (
            <p className="text-sm text-muted-foreground py-4">
              <Link
                href="/dashboard/settings#subscription"
                className="text-amber-600 hover:underline font-medium"
              >
                Upgrade to use surveys and feedback
              </Link>
            </p>
          ) : surveyQuestions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              No survey questions yet.{" "}
              <Link
                href="/dashboard/surveys"
                className="text-[#3BA5D9] hover:underline font-medium"
              >
                Create one in Survey Questions
              </Link>{" "}
              to start collecting feedback.
            </div>
          ) : (
            <div className="space-y-3">
              {surveyQuestionIds.map((qId, idx) => {
                const availableQuestions = surveyQuestions.filter(
                  (q) => q.id === qId || !surveyQuestionIds.includes(q.id)
                );
                const question = surveyQuestions.find((q) => q.id === qId);
                const typeLabel =
                  question?.question_type === "nps"
                    ? "NPS (0-10)"
                    : question?.question_type === "yes_no"
                      ? "Yes / No"
                      : "Rating (1-5)";
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-semibold text-slate-400 w-4 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 space-y-1">
                      {!surveySelectMounted ? (
                        <div
                          className="flex h-9 w-fit items-center gap-2 rounded-md border border-[#e2e8f0] bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-xs"
                          aria-hidden
                        >
                          {question?.question_text ?? "Select a question..."}
                        </div>
                      ) : (
                        <Select
                          value={qId}
                          onValueChange={(val) => {
                            const next = [...surveyQuestionIds];
                            next[idx] = val;
                            setSurveyQuestionIds(next);
                          }}
                        >
                          <SelectTrigger className="border-[#e2e8f0]">
                            <SelectValue placeholder="Select a question..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableQuestions.map((q) => (
                              <SelectItem key={q.id} value={q.id}>
                                {q.question_text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {question && (
                        <p className="text-xs text-muted-foreground pl-0.5">
                          Type: {typeLabel}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSurveyQuestionIds(
                          surveyQuestionIds.filter((_, i) => i !== idx)
                        );
                      }}
                      className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Remove question"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {surveyQuestionIds.length < 3 &&
                surveyQuestionIds.length < surveyQuestions.length && (
                  <button
                    type="button"
                    onClick={() => {
                      const available = surveyQuestions.find(
                        (q) => !surveyQuestionIds.includes(q.id)
                      );
                      if (available) {
                        setSurveyQuestionIds([
                          ...surveyQuestionIds,
                          available.id,
                        ]);
                      }
                    }}
                    className="text-sm font-medium text-[#3BA5D9] hover:underline"
                  >
                    + Add question
                    {surveyQuestionIds.length > 0 &&
                      ` (${surveyQuestionIds.length}/3)`}
                  </button>
                )}
              {surveyQuestionIds.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No feedback questions selected. Click &quot;+ Add question&quot; to
                  get started.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource blocks */}
      <div id="fanflet-resource-blocks-section" className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1B365D]">
          Resource Blocks
        </h2>
        <p className="text-sm text-muted-foreground">
          Add links, files, text, and sponsor blocks to your Fanflet page.
        </p>

        <div className="space-y-4">
          {resourceBlocks.map((block, index) => {
            const isOrphaned = Boolean(block.library_item_id) && !block.resource_library;
            if (isOrphaned) {
              return (
                <OrphanedBlockCard
                  key={block.id}
                  blockId={block.id}
                  fanfletId={fanflet.id}
                  onRemoved={() => router.refresh()}
                />
              );
            }
            return (
              <ResourceBlockCard
                key={block.id}
                block={block}
                fanfletId={fanflet.id}
                authUserId={authUserId}
                isFirst={index === 0}
                isLast={index === resourceBlocks.length - 1}
                connectedSponsors={connectedSponsors}
                endedSponsors={endedSponsors}
              />
            );
          })}

          <AddBlockForm
            fanfletId={fanflet.id}
            authUserId={authUserId}
            onAdded={() => {}}
            libraryItems={libraryItems}
            linkedLibraryItemIds={new Set(resourceBlocks.map((b) => b.library_item_id).filter(Boolean) as string[])}
            allowSponsorVisibility={allowSponsorVisibility}
            connectedSponsors={connectedSponsors}
          />
        </div>
      </div>
      </div>

      {/* Sticky bottom action bar — offset by sidebar width on desktop */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-slate-200 border-t border-slate-300 px-4 sm:px-6 md:px-8 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-end gap-2 max-w-[1400px] mx-auto">
          <Button
            size="sm"
            onClick={handleSaveClick}
            disabled={saving}
            className="flex-1 md:flex-none bg-[#1B365D] hover:bg-[#152b4d]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
          {fanflet.status === "draft" && (
            <Button
              size="sm"
              onClick={handlePublish}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Publish
            </Button>
          )}
          <Button size="sm" variant="outline" asChild className="md:hidden">
            <Link href={`/dashboard/fanflets/${fanflet.id}/qr`}>
              <QrCode className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
