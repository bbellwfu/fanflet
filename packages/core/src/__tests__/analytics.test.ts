import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./mock-supabase";
import {
  getDashboardOverview,
  getFanfletAnalytics,
} from "../analytics";
import type { SpeakerEntitlements } from "../types";

const SPEAKER_ID = "speaker-123";

function makeEntitlements(overrides?: Partial<SpeakerEntitlements>): SpeakerEntitlements {
  return {
    features: new Set(["basic_engagement_stats", "click_through_analytics"]),
    limits: { max_fanflets: -1 },
    planName: "pro",
    planDisplayName: "Pro",
    ...overrides,
  };
}

describe("getFanfletAnalytics", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("returns upgrade_required without basic_engagement_stats feature", async () => {
    const result = await getFanfletAnalytics(
      mock.client,
      "fan-1",
      makeEntitlements({ features: new Set() })
    );
    expect(result.error?.code).toBe("upgrade_required");
    expect(result.error?.feature).toBe("basic_engagement_stats");
  });

  it("returns analytics data on success", async () => {
    mock.whenTable("analytics_events").returns({
      data: [
        { event_type: "page_view", visitor_hash: "hash1", source: "direct" },
        { event_type: "page_view", visitor_hash: "hash2", source: "qr" },
        { event_type: "page_view", visitor_hash: "hash1", source: "direct" },
        { event_type: "resource_click", visitor_hash: "hash1", source: null },
        { event_type: "email_signup", visitor_hash: "hash3", source: null },
        { event_type: "qr_scan", visitor_hash: "hash4", source: null },
        { event_type: "sms_bookmark", visitor_hash: "hash5", source: null },
      ],
      error: null,
    });

    const result = await getFanfletAnalytics(mock.client, "fan-1", makeEntitlements());
    expect(result.error).toBeUndefined();

    const data = result.data!;
    expect(data.pageViews).toBe(3);
    expect(data.uniqueVisitors).toBe(2); // hash1 + hash2
    expect(data.resourceClicks).toBe(1);
    expect(data.emailSignups).toBe(1);
    expect(data.qrScans).toBe(1);
    expect(data.smsBookmarks).toBe(1);
    expect(data.pageViewsBySource).toEqual({ direct: 2, qr: 1 });
  });

  it("returns zeros for empty events", async () => {
    mock.whenTable("analytics_events").returns({ data: [], error: null });

    const result = await getFanfletAnalytics(mock.client, "fan-1", makeEntitlements());
    expect(result.error).toBeUndefined();
    expect(result.data!.pageViews).toBe(0);
    expect(result.data!.uniqueVisitors).toBe(0);
  });

  it("returns internal_error on query failure", async () => {
    mock.whenTable("analytics_events").returns({
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    const result = await getFanfletAnalytics(mock.client, "fan-1", makeEntitlements());
    expect(result.error?.code).toBe("internal_error");
  });
});
