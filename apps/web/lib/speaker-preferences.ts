import { DEFAULT_THEME_ID, THEME_PRESETS } from "@/lib/themes";

type SocialLinksValue = unknown;

export function toSocialLinksRecord(socialLinks: SocialLinksValue): Record<string, unknown> {
  if (!socialLinks || typeof socialLinks !== "object") {
    return {};
  }
  return socialLinks as Record<string, unknown>;
}

export function getStoredDefaultThemePreset(socialLinks: SocialLinksValue): string | null {
  const record = toSocialLinksRecord(socialLinks);
  const value = record.default_theme_preset;
  if (typeof value !== "string") {
    return null;
  }

  const valid = THEME_PRESETS.some((theme) => theme.id === value);
  return valid ? value : null;
}

export function getDefaultThemePreset(socialLinks: SocialLinksValue): string {
  return getStoredDefaultThemePreset(socialLinks) ?? DEFAULT_THEME_ID;
}

export function hasStoredDefaultThemePreset(socialLinks: SocialLinksValue): boolean {
  return getStoredDefaultThemePreset(socialLinks) !== null;
}

export function isOnboardingDismissed(socialLinks: SocialLinksValue): boolean {
  const record = toSocialLinksRecord(socialLinks);
  const onboarding = record.onboarding;
  if (!onboarding || typeof onboarding !== "object") {
    return false;
  }

  return Boolean((onboarding as Record<string, unknown>).dismissed);
}
