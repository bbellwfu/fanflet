"use client";

import { useState, useEffect } from "react";
import { Star, ThumbsUp, ThumbsDown, CheckCircle, X } from "lucide-react";
import { isPreviewMode } from "./analytics-script";

interface SurveyPromptProps {
  fanfletId: string;
  questionId: string;
  questionText: string;
  questionType: "nps" | "yes_no" | "rating";
}

const STORAGE_KEY_PREFIX = "fanflet-survey-";

export function SurveyPrompt({
  fanfletId,
  questionId,
  questionText,
  questionType,
}: SurveyPromptProps) {
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    // Skip in preview mode
    if (isPreviewMode()) return;

    // Check localStorage — don't show if already submitted or dismissed
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${fanfletId}`);
    if (stored === "submitted" || stored === "dismissed") return;

    // Show the modal (defer to satisfy set-state-in-effect rule)
    queueMicrotask(() => setVisible(true));
  }, [fanfletId]);

  const dismiss = () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${fanfletId}`, "dismissed");
    setVisible(false);
  };

  const submitResponse = async (value: string) => {
    if (submitting || submitted) return;
    setSubmitting(true);

    try {
      const payload = JSON.stringify({
        fanflet_id: fanfletId,
        question_id: questionId,
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

    localStorage.setItem(`${STORAGE_KEY_PREFIX}${fanfletId}`, "submitted");
    setSubmitting(false);
    setSubmitted(true);

    // Auto-close after showing thank you
    setTimeout(() => setVisible(false), 1500);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative w-[92%] max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Dismiss button */}
        {!submitted && (
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
            aria-label="Dismiss survey"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {submitted ? (
          /* Thank-you state */
          <div className="py-12 px-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">Thank you!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your feedback has been recorded.
            </p>
          </div>
        ) : (
          /* Question state */
          <div className="px-6 pt-8 pb-6">
            <p className="text-xs font-medium text-[var(--theme-accent)] uppercase tracking-wider mb-2">
              Quick Feedback
            </p>
            <h2 className="text-lg font-semibold text-slate-900 leading-snug pr-6">
              {questionText}
            </h2>

            <div className="mt-5">
              {questionType === "nps" && (
                <NpsInput onSubmit={submitResponse} disabled={submitting} />
              )}
              {questionType === "yes_no" && (
                <YesNoInput onSubmit={submitResponse} disabled={submitting} />
              )}
              {questionType === "rating" && (
                <RatingInput
                  onSubmit={submitResponse}
                  disabled={submitting}
                  hoveredRating={hoveredRating}
                  setHoveredRating={setHoveredRating}
                />
              )}
            </div>

            <button
              onClick={dismiss}
              className="mt-5 w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// NPS: 0-10 number buttons
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

// Yes/No: two buttons
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

// Rating: 1-5 stars
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
