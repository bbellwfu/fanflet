/**
 * Centralized environment configuration.
 *
 * All environment-dependent values should be accessed through helpers
 * in this file so they stay consistent and fail loudly in production
 * when a required variable is missing.
 */

/**
 * Returns the canonical site URL for the current environment.
 *
 * - In production: reads NEXT_PUBLIC_SITE_URL (throws if missing)
 * - In development: falls back to http://localhost:3000
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is not set. Add it to your Vercel environment variables."
      );
    }
    return "http://localhost:3000";
  }
  return url;
}
