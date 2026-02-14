import type { CSSProperties } from "react";

export type ThemePreset = {
  id: string;
  name: string;
  colors: Record<string, string>;
};

export const DEFAULT_THEME_ID = "default";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Navy",
    colors: {
      "--theme-primary": "#1B365D",
      "--theme-primary-mid": "#1e3f6e",
      "--theme-primary-dark": "#0f2440",
      "--theme-primary-light": "#EFF6FF",
      "--theme-accent": "#3BA5D9",
      "--theme-accent-hover": "#2d8fbd",
      "--theme-hero-text": "#bfdbfe",
      "--theme-hero-text-muted": "#7db0d4",
    },
  },
  {
    id: "crimson",
    name: "Crimson",
    colors: {
      "--theme-primary": "#7B1D1D",
      "--theme-primary-mid": "#8B2525",
      "--theme-primary-dark": "#5C1414",
      "--theme-primary-light": "#FEF2F2",
      "--theme-accent": "#F87171",
      "--theme-accent-hover": "#EF4444",
      "--theme-hero-text": "#FECACA",
      "--theme-hero-text-muted": "#D4918F",
    },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
      "--theme-primary": "#14532D",
      "--theme-primary-mid": "#166534",
      "--theme-primary-dark": "#0A3B1B",
      "--theme-primary-light": "#F0FDF4",
      "--theme-accent": "#34D399",
      "--theme-accent-hover": "#10B981",
      "--theme-hero-text": "#A7F3D0",
      "--theme-hero-text-muted": "#6DD4A8",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      "--theme-primary": "#78350F",
      "--theme-primary-mid": "#854D0E",
      "--theme-primary-dark": "#5C2808",
      "--theme-primary-light": "#FFFBEB",
      "--theme-accent": "#FBBF24",
      "--theme-accent-hover": "#F59E0B",
      "--theme-hero-text": "#FDE68A",
      "--theme-hero-text-muted": "#D4B867",
    },
  },
  {
    id: "royal",
    name: "Royal",
    colors: {
      "--theme-primary": "#3B0764",
      "--theme-primary-mid": "#4C1D95",
      "--theme-primary-dark": "#2E0550",
      "--theme-primary-light": "#F5F3FF",
      "--theme-accent": "#A78BFA",
      "--theme-accent-hover": "#8B5CF6",
      "--theme-hero-text": "#DDD6FE",
      "--theme-hero-text-muted": "#B8A8D8",
    },
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      "--theme-primary": "#1E293B",
      "--theme-primary-mid": "#273548",
      "--theme-primary-dark": "#0F172A",
      "--theme-primary-light": "#F1F5F9",
      "--theme-accent": "#2DD4BF",
      "--theme-accent-hover": "#14B8A6",
      "--theme-hero-text": "#CBD5E1",
      "--theme-hero-text-muted": "#94A3B8",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      "--theme-primary": "#0F172A",
      "--theme-primary-mid": "#1A2540",
      "--theme-primary-dark": "#060C1A",
      "--theme-primary-light": "#EEF2FF",
      "--theme-accent": "#60A5FA",
      "--theme-accent-hover": "#3B82F6",
      "--theme-hero-text": "#C7D2FE",
      "--theme-hero-text-muted": "#9AA5D0",
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    colors: {
      "--theme-primary": "#7C2D12",
      "--theme-primary-mid": "#8B3A1E",
      "--theme-primary-dark": "#5C1F0A",
      "--theme-primary-light": "#FFF7ED",
      "--theme-accent": "#FB923C",
      "--theme-accent-hover": "#F97316",
      "--theme-hero-text": "#FED7AA",
      "--theme-hero-text-muted": "#D4A87A",
    },
  },
];

export function getThemeById(id: string): ThemePreset {
  return (
    THEME_PRESETS.find((t) => t.id === id) ??
    THEME_PRESETS.find((t) => t.id === DEFAULT_THEME_ID)!
  );
}

export function getThemeCSSVariables(themeId?: string | null): CSSProperties {
  const theme = getThemeById(themeId ?? DEFAULT_THEME_ID);
  // Cast to CSSProperties — React allows custom properties in style objects
  return theme.colors as unknown as CSSProperties;
}

export function resolveThemeId(
  themeConfig?: Record<string, unknown> | null
): string {
  if (themeConfig && typeof themeConfig.preset === "string") {
    return themeConfig.preset;
  }
  return DEFAULT_THEME_ID;
}
