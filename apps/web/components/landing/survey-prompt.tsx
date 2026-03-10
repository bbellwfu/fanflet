"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { isPreviewMode, getSourceFromRef } from "./analytics-script";

export interface SurveyQuestion {
  id: string;
  text: string;
  type: "nps" | "yes_no" | "rating";
}

interface SurveyPromptProps {
  fanfletId: string;
  questions: SurveyQuestion[];
  onComplete?: () => void;
}

export const SURVEY_STORAGE_KEY_PREFIX = "fanflet-survey-";

export function SurveyPrompt({
  fanfletId,
  questions,
  onComplete,
}: SurveyPromptProps) {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const total = questions.length;
  const current = questions[currentIndex];
  const isLast = currentIndex >= total - 1;

  useEffect(() => {
    if (isPreviewMode()) return;

    const stored = localStorage.getItem(`${SURVEY_STORAGE_KEY_PREFIX}${fanfletId}`);
    if (stored === "submitted" || stored === "dismissed") return;

    queueMicrotask(() => setVisible(true));
  }, [fanfletId]);

  useEffect(() => {
    if (!visible) return;

    const source = getSourceFromRef();
    const payload = JSON.stringify({
      fanflet_id: fanfletId,
      event_type: "survey_shown",
      source,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" })
      );
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {});
    }
  }, [visible, fanfletId]);

  const skipAll = useCallback(() => {
    localStorage.setItem(`${SURVEY_STORAGE_KEY_PREFIX}${fanfletId}`, "dismissed");
    setVisible(false);
    onComplete?.();
  }, [fanfletId, onComplete]);

  const advanceOrFinish = useCallback(() => {
    if (isLast) {
      localStorage.setItem(`${SURVEY_STORAGE_KEY_PREFIX}${fanfletId}`, "submitted");
      setSubmitted(true);
      setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1500);
    } else {
      setCurrentIndex((i) => i + 1);
      setHoveredRating(0);
    }
  }, [isLast, fanfletId, onComplete]);

  const submitResponse = async (value: string) => {
    if (submitting || submitted) return;
    setSubmitting(true);

    try {
      const payload = JSON.stringify({
        fanflet_id: fanfletId,
        question_id: current.id,
        response_value: value,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/survey",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        await fetch("/api/survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      }
    } catch {
      // Fail silently
    }

    setSubmitting(false);
    advanceOrFinish();
  };

  if (!visible || !current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-[92%] max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {submitted ? (
          <div className="py-12 px-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">Thank you!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your feedback has been recorded.
            </p>
          </div>
        ) : (
          <div className="px-6 pt-8 pb-6">
            {total > 1 && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-400">
                  Question {currentIndex + 1} of {total}
                </p>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-6 rounded-full transition-colors ${
                        i <= currentIndex
                          ? "bg-[var(--theme-accent)]"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-medium text-[var(--theme-accent)] uppercase tracking-wider mb-2">
              Quick Feedback
            </p>
            <h2 className="text-lg font-semibold text-slate-900 leading-snug">
              {current.text}
            </h2>

            <div className="mt-5">
              {current.type === "nps" && (
                <NpsInput onSubmit={submitResponse} disabled={submitting} />
              )}
              {current.type === "yes_no" && (
                <YesNoInput onSubmit={submitResponse} disabled={submitting} />
              )}
              {current.type === "rating" && (
                <RatingInput
                  onSubmit={submitResponse}
                  disabled={submitting}
                  hoveredRating={hoveredRating}
                  setHoveredRating={setHoveredRating}
                />
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-4">
              {!isLast && (
                <button
                  onClick={() => advanceOrFinish()}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Next
                </button>
              )}
              <button
                onClick={skipAll}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NpsInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="flex gap-1 justify-between">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onSubmit(String(i))}
            disabled={disabled}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-md text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-[var(--theme-primary)] hover:text-white hover:border-[var(--theme-primary)] transition-colors disabled:opacity-50 text-slate-700"
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground px-1">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}

function YesNoInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onSubmit("yes")}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 hover:border-emerald-400 transition-colors disabled:opacity-50"
      >
        <ThumbsUp className="w-5 h-5" />
        Yes
      </button>
      <button
        onClick={() => onSubmit("no")}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50"
      >
        <ThumbsDown className="w-5 h-5" />
        No
      </button>
    </div>
  );
}

function RatingInput({
  onSubmit,
  disabled,
  hoveredRating,
  setHoveredRating,
}: {
  onSubmit: (val: string) => void;
  disabled: boolean;
  hoveredRating: number;
  setHoveredRating: (r: number) => void;
}) {
  return (
    <div>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onSubmit(String(star))}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={disabled}
            className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star
              className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                star <= hoveredRating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground px-4">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}
