import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Standard result type for all core service functions.
 * Callers (server actions, MCP tools, background jobs) inspect `.error`
 * and handle framework-specific concerns (revalidation, redirect, etc.).
 */
export interface ServiceResult<T = void> {
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  code: ErrorCode;
  message: string;
  /** Feature key when code is 'upgrade_required' */
  feature?: string;
  /** Current plan name when code is 'upgrade_required' */
  currentPlan?: string;
}

export type ErrorCode =
  | "not_found"
  | "forbidden"
  | "limit_reached"
  | "upgrade_required"
  | "validation_error"
  | "conflict"
  | "internal_error";

/**
 * Entitlements resolved for a speaker. Matches the shape from @fanflet/db
 * but defined here to avoid coupling core to the db package's React-wrapped export.
 */
export interface SpeakerEntitlements {
  features: Set<string>;
  limits: Record<string, number>;
  planName: string | null;
  planDisplayName: string | null;
}

/**
 * Entitlements resolved for a sponsor. Mirrors the speaker model with
 * both feature flags and plan limits.
 */
export interface SponsorEntitlements {
  features: Set<string>;
  limits: Record<string, number>;
  planName: string | null;
  planDisplayName: string | null;
}

/**
 * A Supabase client scoped to an authenticated user (RLS-enforced).
 * Core functions accept this rather than creating their own client.
 */
export type UserScopedClient = SupabaseClient;

export function ok<T>(data: T): ServiceResult<T> {
  return { data };
}

export function err(code: ErrorCode, message: string, extra?: Partial<Omit<ServiceError, "code" | "message">>): ServiceResult<never> {
  return { error: { code, message, ...extra } };
}
