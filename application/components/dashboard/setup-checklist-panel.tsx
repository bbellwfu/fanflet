"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, X } from "lucide-react";
import { toast } from "sonner";
import { dismissOnboardingChecklist, resumeOnboardingChecklist } from "@/app/dashboard/onboarding-actions";
import { hasStoredDefaultThemePreset, isOnboardingDismissed } from "@/lib/speaker-preferences";

type ChecklistSpeaker = {
  name?: string | null;
  photo_url?: string | null;
  slug?: string | null;
  social_links?: unknown;
};

interface SetupChecklistPanelProps {
  speaker: ChecklistSpeaker | null;
  fanfletCount: number;
  publishedFanfletCount: number;
  surveyQuestionCount: number;
  resourceLibraryCount: number;
  pathname: string;
  compact?: boolean;
}

export function SetupChecklistPanel({
  speaker,
  fanfletCount,
  publishedFanfletCount,
  surveyQuestionCount,
  resourceLibraryCount,
  pathname,
  compact = false,
}: SetupChecklistPanelProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dismissedOverride, setDismissedOverride] = useState<boolean | null>(null);

  const dismissed = dismissedOverride ?? isOnboardingDismissed(speaker?.social_links ?? null);

  const hasCreatedFanflet =
    fanfletCount > 0 ||
    (pathname.startsWith("/dashboard/fanflets/") && pathname !== "/dashboard/fanflets/new");
  const hasPublishedFanflet = publishedFanfletCount > 0;

  const tasks = [
    {
      id: "name",
      label: "Add your name",
      done: Boolean(speaker?.name?.trim()),
      href: "/dashboard/settings?focus=name",
    },
    {
      id: "photo",
      label: "Upload a profile photo",
      done: Boolean(speaker?.photo_url),
      href: "/dashboard/settings?focus=photo",
    },
    {
      id: "link",
      label: "Set your public profile link",
      done: Boolean(speaker?.slug?.trim()),
      href: "/dashboard/settings?focus=public-link",
    },
    {
      id: "theme",
      label: "Choose a default theme",
      done: hasStoredDefaultThemePreset(speaker?.social_links ?? null),
      href: "/dashboard/settings?focus=default-theme",
    },
    {
      id: "survey",
      label: "Create a survey question",
      done: surveyQuestionCount > 0,
      href: "/dashboard/surveys?focus=nps-template",
    },
    {
      id: "resource",
      label: "Add a resource link",
      done: resourceLibraryCount > 0,
      href: "/dashboard/resources?focus=example-link",
    },
    {
      id: "fanflet",
      label: "Create your first Fanflet",
      done: hasCreatedFanflet,
      href: "/dashboard/fanflets/new?focus=title",
    },
    {
      id: "publish",
      label: "Publish your first Fanflet",
      done: hasPublishedFanflet,
      href: "/dashboard/fanflets",
    },
  ];

  const completed = tasks.filter((task) => task.done).length;
  const allCompleted = completed === tasks.length;
  const focusParam = searchParams.get("focus");

  const activeTaskId =
    pathname === "/dashboard/settings"
      ? focusParam === "photo"
        ? "photo"
        : focusParam === "name"
          ? "name"
          : focusParam === "public-link"
            ? "link"
            : focusParam === "default-theme"
              ? "theme"
              : null
      : pathname === "/dashboard/fanflets/new"
        ? "fanflet"
        : pathname.startsWith("/dashboard/fanflets")
          ? "publish"
          : pathname.startsWith("/dashboard/surveys")
            ? "survey"
            : pathname.startsWith("/dashboard/resources")
              ? "resource"
        : null;

  if (allCompleted) return null;

  const handleDismiss = () => {
    startTransition(async () => {
      const result = await dismissOnboardingChecklist();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDismissedOverride(true);
      toast.success("Setup checklist hidden. You can reopen it from Overview.");
    });
  };

  const handleResume = () => {
    startTransition(async () => {
      const result = await resumeOnboardingChecklist();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setDismissedOverride(false);
      toast.success("Setup checklist resumed.");
    });
  };

  if (dismissed) {
    if (pathname !== "/dashboard") return null;
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#1B365D]">Setup paused</CardTitle>
          <CardDescription>Resume setup anytime to finish your account essentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={handleResume}
            disabled={isPending}
            className="w-full bg-[#1B365D] hover:bg-[#152b4d]"
          >
            Resume setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-[#1B365D]">Setup checklist</CardTitle>
            <CardDescription>
              {completed}/{tasks.length} complete
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-700"
            onClick={handleDismiss}
            disabled={isPending}
            aria-label="Dismiss setup checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : undefined}>
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={task.href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  task.id === activeTaskId
                    ? "bg-[#1B365D]/10 ring-1 ring-[#3BA5D9]/35 shadow-sm text-[#1B365D] font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {task.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <span>{task.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
