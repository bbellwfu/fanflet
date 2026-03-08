import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./mock-supabase";
import {
  listSubscribers,
  getSubscriberCount,
  deleteSubscriber,
  deleteSubscribers,
} from "../subscribers";

const SPEAKER_ID = "speaker-123";

describe("listSubscribers", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("returns subscribers with fanflet titles enriched", async () => {
    mock.whenTable("subscribers").returns({
      data: [
        { id: "s1", email: "a@b.com", name: "Alice", created_at: "2026-01-01", source_fanflet_id: "f1" },
        { id: "s2", email: "b@b.com", name: null, created_at: "2026-01-02", source_fanflet_id: null },
      ],
      error: null,
    });

    mock.whenTable("fanflets").returns({
      data: [{ id: "f1", title: "My Talk" }],
      error: null,
    });

    const result = await listSubscribers(mock.client, SPEAKER_ID);
    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].source_fanflet_title).toBe("My Talk");
    expect(result.data?.[1].source_fanflet_title).toBeNull();
  });

  it("handles empty subscriber list", async () => {
    mock.whenTable("subscribers").returns({ data: [], error: null });

    const result = await listSubscribers(mock.client, SPEAKER_ID);
    expect(result.data).toEqual([]);
  });

  it("returns internal_error on db failure", async () => {
    mock.whenTable("subscribers").returns({
      data: null,
      error: { code: "42P01", message: "table missing" },
    });

    const result = await listSubscribers(mock.client, SPEAKER_ID);
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("getSubscriberCount", () => {
  it("returns the count for a speaker", async () => {
    const mock = createMockSupabase();
    mock.whenTable("subscribers").returns({ data: null, error: null, count: 42 });

    const result = await getSubscriberCount(mock.client, SPEAKER_ID);
    expect(result.data?.total).toBe(42);
  });

  it("returns 0 when count is null", async () => {
    const mock = createMockSupabase();
    mock.whenTable("subscribers").returns({ data: null, error: null, count: null });

    const result = await getSubscriberCount(mock.client, SPEAKER_ID);
    expect(result.data?.total).toBe(0);
  });
});

describe("deleteSubscriber", () => {
  it("returns ok on successful delete", async () => {
    const mock = createMockSupabase();
    mock.whenTable("subscribers").returns({ data: null, error: null });

    const result = await deleteSubscriber(mock.client, SPEAKER_ID, "sub-1");
    expect(result.error).toBeUndefined();
  });

  it("returns internal_error on failure", async () => {
    const mock = createMockSupabase();
    mock.whenTable("subscribers").returns({
      data: null,
      error: { code: "42501", message: "insufficient privilege" },
    });

    const result = await deleteSubscriber(mock.client, SPEAKER_ID, "sub-1");
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("deleteSubscribers (bulk)", () => {
  it("returns validation_error when ids array is empty", async () => {
    const mock = createMockSupabase();

    const result = await deleteSubscribers(mock.client, SPEAKER_ID, []);
    expect(result.error?.code).toBe("validation_error");
  });

  it("returns deleted count on success", async () => {
    const mock = createMockSupabase();
    mock.whenTable("subscribers").returns({ data: null, error: null, count: 3 });

    const result = await deleteSubscribers(mock.client, SPEAKER_ID, ["s1", "s2", "s3"]);
    expect(result.data?.deletedCount).toBe(3);
  });
});
