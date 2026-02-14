"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  updateFanfletDetails,
  publishFanflet,
  unpublishFanflet,
} from "@/app/dashboard/fanflets/[id]/actions";
import { toast } from "sonner";
import { ResourceBlockCard } from "./resource-block-card";
import { AddBlockForm } from "./add-block-form";
import { ThemePicker } from "./theme-picker";
import { resolveThemeId, DEFAULT_THEME_ID } from "@/lib/themes";

type Fanflet = {
  id: string;
  title: string;
  description: string | null;
  event_name: string;
  event_date: string | null;
  slug: string;
  status: string;
  survey_question_id: string | null;
  theme_config: Record<string, unknown> | null;
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
}: FanfletEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showSlugWarning, setShowSlugWarning] = useState(false);

  const [title, setTitle] = useState(fanflet.title);
  const [description, setDescription] = useState(fanflet.description ?? "");
  const [eventName, setEventName] = useState(fanflet.event_name);
  const [eventDate, setEventDate] = useState(
    fanflet.event_date ? fanflet.event_date.slice(0, 10) : ""
  );
  const [slug, setSlug] = useState(fanflet.slug);
  const [surveyQuestionId, setSurveyQuestionId] = useState(
    fanflet.survey_question_id ?? "none"
  );
  const [selectedThemeId, setSelectedThemeId] = useState(
    resolveThemeId(fanflet.theme_config)
  );

  const slugChanged = slug !== fanflet.slug;

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
    formData.set("event_date", eventDate || "");
    formData.set("slug", slug);
    formData.set("survey_question_id", surveyQuestionId === "none" ? "" : surveyQuestionId);
    formData.set(
      "theme_config",
      JSON.stringify(
        selectedThemeId === DEFAULT_THEME_ID
          ? {}
          : { preset: selectedThemeId }
      )
    );

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
      toast.success("Fanflet published!");
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
    <div className="max-w-4xl mx-auto">
      {/* Sticky header bar */}
      <div className="sticky top-16 md:top-0 z-30 bg-slate-50 -mx-6 md:-mx-8 px-6 md:px-8 pt-2 pb-4 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto">
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

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {fanflet.status === "draft" && (
              <Button
                size="sm"
                onClick={handlePublish}
                className="bg-[#1B365D] hover:bg-[#152b4d]"
              >
                Publish
              </Button>
            )}
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
                QR Code
              </Link>
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={handleSaveClick}
              disabled={saving}
              className="bg-[#1B365D] hover:bg-[#152b4d]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
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

      <div className="space-y-8 mt-6">

      {/* Details section */}
      <Card className="border-slate-200">
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
                <Label>Event Name</Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Event name"
                  className="border-[#e2e8f0]"
                />
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
                <div className="flex items-center gap-2">
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
                    className="border-[#e2e8f0] font-mono flex-1"
                  />
                </div>
                {slugChanged && fanflet.status === "published" && (
                  <p className="text-xs text-amber-600">
                    Changing the slug will invalidate any previously shared QR codes and links.
                  </p>
                )}
              </div>

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
      <Card className="border-slate-200">
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
          />
        </CardContent>
      </Card>

      {/* Feedback Question */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#1B365D] flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback Question
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Optionally display a quick feedback question when visitors open this Fanflet.
          </p>
        </CardHeader>
        <CardContent>
          {surveyQuestions.length === 0 ? (
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
              <Select
                value={surveyQuestionId}
                onValueChange={setSurveyQuestionId}
              >
                <SelectTrigger className="border-[#e2e8f0]">
                  <SelectValue placeholder="Select a question..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (no survey)</SelectItem>
                  {surveyQuestions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.question_text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {surveyQuestionId !== "none" && (
                <p className="text-xs text-muted-foreground">
                  Type:{" "}
                  {surveyQuestions.find((q) => q.id === surveyQuestionId)
                    ?.question_type === "nps"
                    ? "NPS (0-10 scale)"
                    : surveyQuestions.find((q) => q.id === surveyQuestionId)
                        ?.question_type === "yes_no"
                    ? "Yes / No"
                    : "Rating (1-5 Stars)"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource blocks */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1B365D]">
          Resource Blocks
        </h2>
        <p className="text-sm text-muted-foreground">
          Add links, files, text, and sponsor blocks to your Fanflet page.
        </p>

        <div className="space-y-4">
          {resourceBlocks.map((block, index) => (
            <ResourceBlockCard
              key={block.id}
              block={block}
              fanfletId={fanflet.id}
              authUserId={authUserId}
              isFirst={index === 0}
              isLast={index === resourceBlocks.length - 1}
            />
          ))}

          <AddBlockForm
            fanfletId={fanflet.id}
            authUserId={authUserId}
            onAdded={() => {}}
            libraryItems={libraryItems}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
