/**
 * Domain events emitted by core service functions.
 *
 * Both the integration layer (outbound pushes to CRM/marketing tools)
 * and the MCP server (notifications to AI agents) subscribe to these events.
 *
 * The EventBus implementation depends on the chosen background job infrastructure:
 * - Inngest: inngest.send({ name: event.type, data: event.payload })
 * - pg_cron: insert into an outbox table
 * - Simple: POST to an internal API route
 */

/* ------------------------------------------------------------------ */
/*  Event definitions                                                  */
/* ------------------------------------------------------------------ */

export type DomainEvent =
  | LeadCapturedEvent
  | SubscriberAddedEvent
  | ConnectionAcceptedEvent
  | ConnectionDeclinedEvent
  | ConnectionEndedEvent
  | FanfletPublishedEvent
  | FanfletCreatedEvent
  | ReportViewedEvent;

export interface LeadCapturedEvent {
  type: "lead.captured";
  payload: {
    subscriberId: string;
    sponsorId: string;
    fanfletId: string;
    speakerId: string;
    resourceBlockId?: string;
    engagementType: string;
  };
}

export interface SubscriberAddedEvent {
  type: "subscriber.added";
  payload: {
    subscriberId: string;
    fanfletId: string;
    speakerId: string;
    email: string;
    sponsorConsent: boolean;
  };
}

export interface ConnectionAcceptedEvent {
  type: "connection.accepted";
  payload: {
    connectionId: string;
    sponsorId: string;
    speakerId: string;
  };
}

export interface ConnectionDeclinedEvent {
  type: "connection.declined";
  payload: {
    connectionId: string;
    sponsorId: string;
    speakerId: string;
  };
}

export interface ConnectionEndedEvent {
  type: "connection.ended";
  payload: {
    connectionId: string;
    sponsorId: string;
    speakerId: string;
    endedBy: "speaker" | "sponsor";
  };
}

export interface FanfletPublishedEvent {
  type: "fanflet.published";
  payload: {
    fanfletId: string;
    speakerId: string;
    title: string;
    firstPublished: boolean;
  };
}

export interface FanfletCreatedEvent {
  type: "fanflet.created";
  payload: {
    fanfletId: string;
    speakerId: string;
    title: string;
  };
}

export interface ReportViewedEvent {
  type: "report.viewed";
  payload: {
    fanfletId: string;
    sponsorId: string;
  };
}

/* ------------------------------------------------------------------ */
/*  EventBus interface                                                 */
/* ------------------------------------------------------------------ */

export interface EventBus {
  emit(event: DomainEvent): Promise<void>;
}

/**
 * No-op event bus for contexts where events should be silently dropped
 * (e.g., tests, migrations, or when no bus is configured yet).
 */
export const nullEventBus: EventBus = {
  async emit() {},
};
