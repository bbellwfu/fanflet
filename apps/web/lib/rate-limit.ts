import { NextRequest, NextResponse } from "next/server";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateLimitWindow>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, window] of windows) {
    if (now > window.resetAt) {
      windows.delete(key);
    }
  }
}

/**
 * Per-instance in-memory rate limiter. Each Vercel serverless function
 * instance tracks its own window independently. This provides best-effort
 * rate limiting; for strict enforcement across instances, upgrade to
 * Upstash Redis.
 */
export function rateLimit(
  request: NextRequest,
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; response?: NextResponse } {
  cleanup();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const windowKey = `${key}:${ip}`;
  const now = Date.now();
  const window = windows.get(windowKey);

  if (!window || now > window.resetAt) {
    windows.set(windowKey, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }

  window.count++;
  if (window.count > limit) {
    const retryAfter = Math.ceil((window.resetAt - now) / 1000);
    return {
      limited: true,
      remaining: 0,
      response: NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      ),
    };
  }

  return { limited: false, remaining: limit - window.count };
}
