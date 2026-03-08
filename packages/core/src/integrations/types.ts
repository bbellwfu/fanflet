/**
 * Integration adapter interface and shared types.
 *
 * Each supported platform implements IntegrationAdapter to handle
 * outbound event pushes (lead syncs, subscriber exports, etc.).
 */

export interface IntegrationAdapter {
  readonly platform: PlatformId;

  /**
   * Push a domain event to the external service.
   * Returns a normalized result so the caller doesn't need platform-specific handling.
   */
  push(ctx: PushContext): Promise<PushResult>;

  /**
   * Validate that a connection's credentials/config are still functional.
   * Called periodically or before first push.
   */
  healthCheck(connection: ConnectionConfig): Promise<HealthCheckResult>;
}

export type PlatformId =
  | "hubspot"
  | "mailchimp"
  | "pipedrive"
  | "google_sheets"
  | "airtable"
  | "zapier";

export interface ConnectionConfig {
  connectionId: string;
  sponsorId: string;
  platform: PlatformId;
  settings: Record<string, unknown>;
  webhookUrls: string[];
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

export interface PushContext {
  connection: ConnectionConfig;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface PushResult {
  success: boolean;
  /** HTTP status code or platform-specific status */
  statusCode?: number;
  /** Platform response body for logging (sanitized) */
  responseBody?: string;
  /** Error message if success=false */
  errorMessage?: string;
  /** Whether the error is retryable (e.g. 429, 5xx) */
  retryable?: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  errorMessage?: string;
  /** Suggested new status for the connection row */
  suggestedStatus?: "connected" | "degraded" | "expired";
}
