import type { EventBus, DomainEvent } from "@fanflet/core";
import { inngest } from "./client";
import { createServiceClient } from "@fanflet/db/service";

/**
 * Inngest-backed EventBus implementation.
 *
 * When a domain event is emitted, this bus:
 * 1. Looks up all active integration_connections for the relevant sponsor
 * 2. Sends an Inngest event for each connection to trigger the push function
 *
 * Events that don't have a sponsor context (e.g., fanflet.created) are
 * forwarded as-is for non-integration consumers (future: notifications).
 */
export const inngestEventBus: EventBus = {
  async emit(event: DomainEvent): Promise<void> {
    const sponsorId = extractSponsorId(event);

    if (!sponsorId) {
      await inngest.send({ name: `domain/${event.type}`, data: event.payload });
      return;
    }

    const supabase = createServiceClient();
    const { data: connections } = await supabase
      .from("integration_connections")
      .select("id, platform, settings")
      .eq("sponsor_id", sponsorId)
      .eq("status", "connected");

    if (!connections || connections.length === 0) {
      return;
    }

    const events = connections.map((conn) => ({
      name: "integration/push" as const,
      data: {
        sponsorId,
        platform: conn.platform,
        eventType: event.type,
        payload: event.payload,
        connectionId: conn.id,
        settings: conn.settings,
      },
    }));

    await inngest.send(events);
  },
};

function extractSponsorId(event: DomainEvent): string | null {
  switch (event.type) {
    case "lead.captured":
      return event.payload.sponsorId;
    case "connection.accepted":
    case "connection.declined":
    case "connection.ended":
      return event.payload.sponsorId;
    case "report.viewed":
      return event.payload.sponsorId;
    default:
      return null;
  }
}
