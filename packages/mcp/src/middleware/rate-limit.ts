import type { ToolContext } from "../types";
import { McpToolError } from "../types";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const windowMs = 60_000;
const adminMaxPerMinute = 60;

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(ctx: ToolContext): void {
  const key = `rate:${ctx.userId}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > adminMaxPerMinute) {
    throw new McpToolError(
      `Rate limit exceeded. Maximum ${adminMaxPerMinute} requests per minute.`,
      "RATE_LIMITED"
    );
  }
}
