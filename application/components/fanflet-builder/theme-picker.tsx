"use client";

import { THEME_PRESETS } from "@/lib/themes";
import { Check } from "lucide-react";

interface ThemePickerProps {
  selectedThemeId: string;
  onChange: (themeId: string) => void;
}

export function ThemePicker({ selectedThemeId, onChange }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {THEME_PRESETS.map((theme) => {
        const isSelected = selectedThemeId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={`relative rounded-xl overflow-hidden h-[72px] flex flex-col items-center justify-end transition-all ${
              isSelected
                ? "ring-2 ring-[#1B365D] ring-offset-2 shadow-md"
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

            {/* Selected check */}
            {isSelected && (
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
        );
      })}
    </div>
  );
}
