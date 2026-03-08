/**
 * Timezone utility library for consistent date/time formatting across the platform.
 *
 * All functions accept `string | null` for timezone:
 * - When a stored IANA timezone is provided, it's used directly
 * - When null, falls back to the browser/runtime default timezone
 *
 * Uses native Intl.DateTimeFormat — zero external dependencies.
 */

export const TIMEZONE_OPTIONS: {
  label: string;
  value: string;
  group: string;
}[] = [
  // US & Canada
  { group: "US & Canada", label: "Eastern Time", value: "America/New_York" },
  { group: "US & Canada", label: "Central Time", value: "America/Chicago" },
  { group: "US & Canada", label: "Mountain Time", value: "America/Denver" },
  { group: "US & Canada", label: "Pacific Time", value: "America/Los_Angeles" },
  { group: "US & Canada", label: "Alaska Time", value: "America/Anchorage" },
  { group: "US & Canada", label: "Hawaii Time", value: "Pacific/Honolulu" },
  { group: "US & Canada", label: "Atlantic Time", value: "America/Halifax" },
  { group: "US & Canada", label: "Newfoundland Time", value: "America/St_Johns" },
  { group: "US & Canada", label: "Arizona (no DST)", value: "America/Phoenix" },

  // Central & South America
  { group: "Americas", label: "Mexico City", value: "America/Mexico_City" },
  { group: "Americas", label: "Bogota", value: "America/Bogota" },
  { group: "Americas", label: "São Paulo", value: "America/Sao_Paulo" },
  { group: "Americas", label: "Buenos Aires", value: "America/Argentina/Buenos_Aires" },

  // Europe
  { group: "Europe", label: "London (GMT/BST)", value: "Europe/London" },
  { group: "Europe", label: "Dublin (GMT/IST)", value: "Europe/Dublin" },
  { group: "Europe", label: "Paris (CET)", value: "Europe/Paris" },
  { group: "Europe", label: "Berlin (CET)", value: "Europe/Berlin" },
  { group: "Europe", label: "Amsterdam (CET)", value: "Europe/Amsterdam" },
  { group: "Europe", label: "Rome (CET)", value: "Europe/Rome" },
  { group: "Europe", label: "Madrid (CET)", value: "Europe/Madrid" },
  { group: "Europe", label: "Zurich (CET)", value: "Europe/Zurich" },
  { group: "Europe", label: "Stockholm (CET)", value: "Europe/Stockholm" },
  { group: "Europe", label: "Helsinki (EET)", value: "Europe/Helsinki" },
  { group: "Europe", label: "Athens (EET)", value: "Europe/Athens" },
  { group: "Europe", label: "Istanbul", value: "Europe/Istanbul" },
  { group: "Europe", label: "Moscow", value: "Europe/Moscow" },

  // Middle East & Africa
  { group: "Middle East & Africa", label: "Dubai", value: "Asia/Dubai" },
  { group: "Middle East & Africa", label: "Riyadh", value: "Asia/Riyadh" },
  { group: "Middle East & Africa", label: "Jerusalem", value: "Asia/Jerusalem" },
  { group: "Middle East & Africa", label: "Cairo", value: "Africa/Cairo" },
  { group: "Middle East & Africa", label: "Johannesburg", value: "Africa/Johannesburg" },
  { group: "Middle East & Africa", label: "Lagos", value: "Africa/Lagos" },
  { group: "Middle East & Africa", label: "Nairobi", value: "Africa/Nairobi" },

  // Asia
  { group: "Asia", label: "Kolkata (IST)", value: "Asia/Kolkata" },
  { group: "Asia", label: "Bangkok", value: "Asia/Bangkok" },
  { group: "Asia", label: "Singapore", value: "Asia/Singapore" },
  { group: "Asia", label: "Hong Kong", value: "Asia/Hong_Kong" },
  { group: "Asia", label: "Shanghai", value: "Asia/Shanghai" },
  { group: "Asia", label: "Taipei", value: "Asia/Taipei" },
  { group: "Asia", label: "Seoul", value: "Asia/Seoul" },
  { group: "Asia", label: "Tokyo", value: "Asia/Tokyo" },

  // Australia & Pacific
  { group: "Australia & Pacific", label: "Perth (AWST)", value: "Australia/Perth" },
  { group: "Australia & Pacific", label: "Adelaide (ACST)", value: "Australia/Adelaide" },
  { group: "Australia & Pacific", label: "Sydney (AEST)", value: "Australia/Sydney" },
  { group: "Australia & Pacific", label: "Brisbane (no DST)", value: "Australia/Brisbane" },
  { group: "Australia & Pacific", label: "Auckland (NZST)", value: "Pacific/Auckland" },
];

function resolveTimezone(timezone: string | null): string {
  if (timezone) return timezone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function formatInTimezone(
  date: string | Date,
  timezone: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const tz = resolveTimezone(timezone);
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: tz }).format(d);
}

/** "Mar 7, 2026" */
export function formatDate(date: string | Date, timezone: string | null): string {
  return formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Mar 7" — for chart axes and compact displays */
export function formatDateShort(date: string | Date, timezone: string | null): string {
  return formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
  });
}

/** "March 7, 2026" */
export function formatDateLong(date: string | Date, timezone: string | null): string {
  return formatInTimezone(date, timezone, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Mar 7, 2026, 3:42 PM EST" */
export function formatDateTime(
  date: string | Date,
  timezone: string | null
): string {
  return formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Convert a UTC ISO timestamp to a YYYY-MM-DD date key in the given timezone.
 * Use for analytics date bucketing instead of `timestamp.split("T")[0]`.
 */
export function toDateKeyInTimezone(
  isoTimestamp: string,
  timezone: string | null
): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return "";
  const tz = resolveTimezone(timezone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "EST", "CST", "PDT", etc. */
export function getTimezoneAbbreviation(timezone: string | null): string {
  const tz = resolveTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Get the browser's detected IANA timezone identifier. */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

/**
 * Get a human-readable label for an IANA timezone from TIMEZONE_OPTIONS.
 * Falls back to the raw IANA identifier if not in the curated list.
 */
export function getTimezoneLabel(tz: string | null): string {
  if (!tz) return "Not set";
  const match = TIMEZONE_OPTIONS.find((o) => o.value === tz);
  return match ? `${match.label} (${getTimezoneAbbreviation(tz)})` : tz;
}
