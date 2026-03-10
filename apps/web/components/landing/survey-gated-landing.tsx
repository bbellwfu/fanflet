"use client";

import { useState, useEffect } from "react";
import { isPreviewMode } from "./analytics-script";
import { SurveyPrompt, SURVEY_STORAGE_KEY_PREFIX } from "./survey-prompt";
import { LandingPage } from "./landing-page";

type Speaker = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  social_links: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  } | null;
};

type ResourceBlock = {
  id: string;
  type: "link" | "file" | "embed" | "text" | "sponsor";
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  image_url: string | null;
  section_name: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  metadata: {
    logo_url?: string;
    cta_text?: string;
    file_size?: string;
  } | null;
};

type Fanflet = {
  id: string;
  title: string;
  description: string | null;
  event_name: string;
  event_date: string | null;
  show_event_name?: boolean;
  resource_blocks: ResourceBlock[];
  theme_config?: Record<string, unknown> | null;
  expiration_date?: string | null;
  show_expiration_notice?: boolean;
};

interface SurveyGatedLandingProps {
  speaker: Speaker;
  fanflet: Fanflet;
  subscriberCount: number;
  showSmsBookmark: boolean;
  speakerSlug: string;
  fanfletSlug: string;
  survey: {
    questionId: string;
    questionText: string;
    questionType: "nps" | "yes_no" | "rating";
  };
}

export function SurveyGatedLanding({
  speaker,
  fanflet,
  subscriberCount,
  showSmsBookmark,
  speakerSlug,
  fanfletSlug,
  survey,
}: SurveyGatedLandingProps) {
  const [gateCleared, setGateCleared] = useState(false);

  useEffect(() => {
    if (isPreviewMode()) {
      setGateCleared(true);
      return;
    }

    const stored = localStorage.getItem(
      `${SURVEY_STORAGE_KEY_PREFIX}${fanflet.id}`
    );
    if (stored === "submitted" || stored === "dismissed") {
      setGateCleared(true);
    }
  }, [fanflet.id]);

  if (gateCleared) {
    return (
      <LandingPage
        speaker={speaker}
        fanflet={fanflet}
        subscriberCount={subscriberCount}
        showSmsBookmark={showSmsBookmark}
        speakerSlug={speakerSlug}
        fanfletSlug={fanfletSlug}
      />
    );
  }

  return (
    <>
      <SurveyPrompt
        fanfletId={fanflet.id}
        questionId={survey.questionId}
        questionText={survey.questionText}
        questionType={survey.questionType}
        onComplete={() => setGateCleared(true)}
      />
      <SurveyGateHero speaker={speaker} fanflet={fanflet} />
    </>
  );
}

function SurveyGateHero({
  speaker,
  fanflet,
}: {
  speaker: Speaker;
  fanflet: Fanflet;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom right, var(--theme-primary), var(--theme-primary-mid), var(--theme-primary-dark))",
          }}
        />
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -mr-20 -mt-20"
          style={{ backgroundColor: "var(--theme-accent)", opacity: 0.15 }}
        />
        <div
          className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl -ml-16 -mb-16"
          style={{ backgroundColor: "var(--theme-accent)", opacity: 0.1 }}
        />

        <div className="relative z-10 px-5 sm:px-8 pt-10 sm:pt-12 pb-16 max-w-lg md:max-w-2xl mx-auto">
          {fanflet.show_event_name !== false && fanflet.event_name && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold text-[var(--theme-hero-text)] border border-white/15">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                {fanflet.event_name}
              </div>
            </div>
          )}

          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {speaker.name}
            </h1>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 sm:px-6 py-5 mt-6">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2 text-[var(--theme-hero-text-muted)]">
                Presentation
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold text-white leading-snug">
                {fanflet.title}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
