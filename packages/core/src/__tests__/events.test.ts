import { describe, it, expect, vi } from "vitest";
import { nullEventBus } from "../events";
import type { EventBus, DomainEvent } from "../events";

describe("nullEventBus", () => {
  it("implements the EventBus interface", () => {
    expect(typeof nullEventBus.emit).toBe("function");
  });

  it("emit() resolves without error", async () => {
    const event: DomainEvent = {
      type: "lead.captured",
      payload: {
        subscriberId: "sub-1",
        sponsorId: "sp-1",
        fanfletId: "fan-1",
        speakerId: "spk-1",
        engagementType: "click",
      },
    };
    await expect(nullEventBus.emit(event)).resolves.toBeUndefined();
  });
});

describe("EventBus contract", () => {
  it("a custom implementation receives the emitted event", async () => {
    const captured: DomainEvent[] = [];
    const testBus: EventBus = {
      async emit(event) {
        captured.push(event);
      },
    };

    const event: DomainEvent = {
      type: "fanflet.published",
      payload: {
        fanfletId: "f-1",
        speakerId: "spk-1",
        title: "My Talk",
        firstPublished: true,
      },
    };

    await testBus.emit(event);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual(event);
  });

  it("supports all domain event types", () => {
    const events: DomainEvent[] = [
      {
        type: "lead.captured",
        payload: { subscriberId: "s1", sponsorId: "sp1", fanfletId: "f1", speakerId: "spk1", engagementType: "view" },
      },
      {
        type: "subscriber.added",
        payload: { subscriberId: "s1", fanfletId: "f1", speakerId: "spk1", email: "a@b.com", sponsorConsent: false },
      },
      {
        type: "connection.accepted",
        payload: { connectionId: "c1", sponsorId: "sp1", speakerId: "spk1" },
      },
      {
        type: "connection.declined",
        payload: { connectionId: "c1", sponsorId: "sp1", speakerId: "spk1" },
      },
      {
        type: "connection.ended",
        payload: { connectionId: "c1", sponsorId: "sp1", speakerId: "spk1", endedBy: "speaker" },
      },
      {
        type: "fanflet.published",
        payload: { fanfletId: "f1", speakerId: "spk1", title: "Talk", firstPublished: false },
      },
      {
        type: "fanflet.created",
        payload: { fanfletId: "f1", speakerId: "spk1", title: "Talk" },
      },
      {
        type: "report.viewed",
        payload: { fanfletId: "f1", sponsorId: "sp1" },
      },
    ];

    expect(events).toHaveLength(8);
    events.forEach((e) => expect(e.type).toBeTruthy());
  });
});
