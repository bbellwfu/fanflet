/**
 * Generate a daily visitor hash from IP + User-Agent + date.
 * Used across track, sms, and survey routes for privacy-preserving
 * unique visitor identification.
 */
export async function generateVisitorHash(
  ip: string,
  userAgent: string
): Promise<string> {
  const dateStr = new Date().toISOString().split("T")[0];
  const hashInput = `${ip}-${userAgent}-${dateStr}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Extract client IP from request headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
