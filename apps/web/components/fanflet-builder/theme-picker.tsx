"use client";

import Link from "next/link";
import { THEME_PRESETS, DEFAULT_THEME_ID } from "@/lib/themes";
import { Check, Lock } from "lucide-react";

interface ThemePickerProps {
  selectedThemeId: string;
  onChange: (themeId: string) => void;
  /** When false, only the base theme is selectable; other themes are shown but disabled with upgrade CTA */
  allowMultipleThemes?: boolean;
  /** Link for "Upgrade to use" when allowMultipleThemes is false. Defaults to /pricing */
  upgradeHref?: string;
}

export function ThemePicker({
  selectedThemeId,
  onChange,
  allowMultipleThemes = true,
  upgradeHref = "/pricing",
}: ThemePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {THEME_PRESETS.map((theme) => {
        const isSelected = selectedThemeId === theme.id;
        const isBaseTheme = theme.id === DEFAULT_THEME_ID;
        const isLocked =
          !allowMultipleThemes && !isBaseTheme;
        // Locked themes stay non-selectable but show their real gradient (no gray) so users see what they're missing.

        return (
          <div key={theme.id} className="relative">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && onChange(theme.id)}
              className={`relative rounded-xl overflow-hidden h-[72px] w-full flex flex-col items-center justify-end transition-all ${
                isLocked
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              } ${
                isSelected
                  ? "ring-2 ring-[#1B365D] ring-offset-2 shadow-md"
                  : isLocked
                    ? "ring-1 ring-amber-400/80 ring-offset-1"
                    : "hover:ring-1 hover:ring-slate-300 hover:ring-offset-1 hover:shadow-sm"
              }`}
            >
              {/* Theme gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom right, ${theme.colors["--theme-primary"]}, ${theme.colors["--theme-primary-mid"]}, ${theme.colors["--theme-primary-dark"]})`,
                }}
              />

              {/* Decorative accent glow */}
              <div
                className="absolute top-0 right-0 w-10 h-10 rounded-full blur-xl -mr-2 -mt-2"
                style={{
                  backgroundColor: theme.colors["--theme-accent"],
                  opacity: 0.3,
                }}
              />

              {/* Lock overlay for gated themes — keep theme colors visible so users see what they're missing */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-[5]">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Selected check */}
              {isSelected && !isLocked && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm z-10">
                  <Check className="w-3 h-3 text-slate-900" />
                </div>
              )}

              {/* Theme label */}
              <div className="relative z-10 flex items-center gap-1.5 pb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/40"
                  style={{
                    backgroundColor: theme.colors["--theme-accent"],
                  }}
                />
                <span className="text-[11px] font-semibold text-white drop-shadow-sm">
                  {theme.name}
                </span>
              </div>
            </button>
            {isLocked && (
              <p className="mt-1.5 text-center">
                <Link
                  href={upgradeHref}
                  className="text-[11px] font-medium text-amber-600 hover:text-amber-700 underline"
                >
                  Upgrade to use
                </Link>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
