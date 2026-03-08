import type {
  IntegrationAdapter,
  PushContext,
  PushResult,
  ConnectionConfig,
  HealthCheckResult,
} from "./types";

const PUSH_TIMEOUT_MS = 10_000;

/**
 * Zapier webhook adapter.
 *
 * Zapier integrations work via webhook URLs configured by the sponsor.
 * Each event is POSTed to all registered webhook URLs with a standardized payload.
 * Zapier handles all downstream routing (CRM sync, email tool, spreadsheet, etc.).
 */
export const zapierAdapter: IntegrationAdapter = {
  platform: "zapier",

  async push(ctx: PushContext): Promise<PushResult> {
    const { connection, eventType, payload } = ctx;
    const webhookUrls = connection.webhookUrls;

    if (!webhookUrls || webhookUrls.length === 0) {
      return {
        success: false,
        errorMessage: "No webhook URLs configured for this Zapier connection.",
        retryable: false,
      };
    }

    const body = JSON.stringify({
      event_type: eventType,
      sponsor_id: connection.sponsorId,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const results = await Promise.allSettled(
      webhookUrls.map((url) => pushToWebhook(url, body))
    );

    const failures = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    );

    if (failures.length === 0) {
      return { success: true, statusCode: 200 };
    }

    if (failures.length === webhookUrls.length) {
      const firstFailure =
        failures[0].status === "fulfilled"
          ? failures[0].value
          : { errorMessage: (failures[0] as PromiseRejectedResult).reason?.message ?? "Unknown error", retryable: true };

      return {
        success: false,
        statusCode: (firstFailure as PushResult).statusCode,
        errorMessage: `All ${webhookUrls.length} webhook(s) failed. First error: ${(firstFailure as PushResult).errorMessage}`,
        retryable: (firstFailure as PushResult).retryable ?? true,
      };
    }

    return {
      success: true,
      statusCode: 207,
      responseBody: `${webhookUrls.length - failures.length}/${webhookUrls.length} webhooks succeeded`,
    };
  },

  async healthCheck(connection: ConnectionConfig): Promise<HealthCheckResult> {
    const webhookUrls = connection.webhookUrls;

    if (!webhookUrls || webhookUrls.length === 0) {
      return {
        healthy: false,
        errorMessage: "No webhook URLs configured.",
        suggestedStatus: "degraded",
      };
    }

    for (const url of webhookUrls) {
      try {
        new URL(url);
      } catch {
        return {
          healthy: false,
          errorMessage: `Invalid webhook URL: ${url}`,
          suggestedStatus: "degraded",
        };
      }
    }

    return { healthy: true, suggestedStatus: "connected" };
  },
};

async function pushToWebhook(url: string, body: string): Promise<PushResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const retryable = response.status === 429 || response.status >= 500;
    const responseText = await response.text().catch(() => "");

    return {
      success: false,
      statusCode: response.status,
      errorMessage: `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
      retryable,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown fetch error";
    const isTimeout = message.includes("abort");

    return {
      success: false,
      errorMessage: isTimeout ? "Request timed out" : message,
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
