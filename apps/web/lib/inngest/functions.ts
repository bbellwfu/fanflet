import { inngest } from "./client";
import { createServiceClient } from "@fanflet/db/service";
import { getAdapter } from "@fanflet/core";
import type { PlatformId, ConnectionConfig } from "@fanflet/core";

/**
 * Push a domain event to an external integration via the adapter registry.
 *
 * Inngest handles retry with exponential backoff automatically.
 * After all retries are exhausted, the integration_events row is marked 'failed'.
 */
export const pushIntegrationEvent = inngest.createFunction(
  {
    id: "integration-push-event",
    retries: 3,
  },
  { event: "integration/push" },
  async ({ event, step }) => {
    const { sponsorId, platform, eventType, payload, connectionId, settings } =
      event.data as {
        sponsorId: string;
        platform: string;
        eventType: string;
        payload: Record<string, unknown>;
        connectionId: string;
        settings: Record<string, unknown>;
      };

    const supabase = createServiceClient();

    const eventRow = await step.run("log-attempt", async () => {
      const { data, error } = await supabase
        .from("integration_events")
        .insert({
          sponsor_id: sponsorId,
          connection_id: connectionId,
          platform,
          event_type: eventType,
          payload,
          status: "retrying",
          attempt_count: 1,
        })
        .select("id")
        .single();

      if (error)
        throw new Error(
          `Failed to log integration event: ${error.message}`
        );
      return data;
    });

    const pushResult = await step.run("execute-push", async () => {
      const adapter = getAdapter(platform as PlatformId);

      if (!adapter) {
        return {
          success: false,
          errorMessage: `No adapter available for platform: ${platform}`,
          retryable: false,
        };
      }

      const { data: connRow } = await supabase
        .from("integration_connections")
        .select(
          "id, sponsor_id, platform, settings, webhook_urls, access_token_encrypted, refresh_token_encrypted, token_expires_at"
        )
        .eq("id", connectionId)
        .single();

      const connectionConfig: ConnectionConfig = {
        connectionId,
        sponsorId,
        platform: platform as PlatformId,
        settings: (connRow?.settings ?? settings ?? {}) as Record<
          string,
          unknown
        >,
        webhookUrls: Array.isArray(connRow?.webhook_urls)
          ? (connRow.webhook_urls as string[])
          : [],
        accessToken: connRow?.access_token_encrypted ?? undefined,
        refreshToken: connRow?.refresh_token_encrypted ?? undefined,
        tokenExpiresAt: connRow?.token_expires_at ?? undefined,
      };

      return adapter.push({
        connection: connectionConfig,
        eventType,
        payload,
      });
    });

    await step.run("update-status", async () => {
      const finalStatus = pushResult.success ? "success" : "failed";

      const { error } = await supabase
        .from("integration_events")
        .update({
          status: finalStatus,
          error_message: pushResult.errorMessage ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", eventRow.id);

      if (error)
        throw new Error(
          `Failed to update event status: ${error.message}`
        );

      if (pushResult.errorMessage) {
        await supabase
          .from("integration_connections")
          .update({
            error_message: pushResult.errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connectionId);
      } else if (pushResult.success) {
        await supabase
          .from("integration_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connectionId);
      }

      if (!pushResult.success && pushResult.retryable) {
        throw new Error(
          `Retryable push failure: ${pushResult.errorMessage}`
        );
      }
    });

    return { eventId: eventRow.id, status: pushResult.success ? "success" : "failed" };
  }
);

export const functions = [pushIntegrationEvent];
