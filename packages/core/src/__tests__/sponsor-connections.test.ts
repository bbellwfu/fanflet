import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./mock-supabase";
import {
  requestSponsorConnection,
  endSpeakerSponsorConnection,
  respondToConnection,
  endSponsorConnection,
  listSponsorConnections,
} from "../sponsor-connections";

const SPEAKER_ID = "speaker-123";
const SPONSOR_ID = "sponsor-456";

describe("requestSponsorConnection", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("creates a new pending connection when none exists", async () => {
    mock.whenTable("sponsor_accounts").returns({ data: { id: SPONSOR_ID }, error: null });
    mock.whenTable("sponsor_connections").returnsSequence([
      { data: null, error: null }, // existing check
      { data: { id: "conn-1" }, error: null }, // insert
    ]);

    const result = await requestSponsorConnection(mock.client, SPEAKER_ID, SPONSOR_ID, "Hello");
    expect(result.error).toBeUndefined();
    expect(result.data?.connectionId).toBe("conn-1");
  });

  it("returns not_found when sponsor doesn't exist", async () => {
    mock.whenTable("sponsor_accounts").returns({ data: null, error: null });

    const result = await requestSponsorConnection(mock.client, SPEAKER_ID, "bad-id");
    expect(result.error?.code).toBe("not_found");
  });

  it("returns conflict when active connection already exists", async () => {
    mock.whenTable("sponsor_accounts").returns({ data: { id: SPONSOR_ID }, error: null });
    mock.whenTable("sponsor_connections").returns({
      data: { id: "conn-existing", status: "active" },
      error: null,
    });

    const result = await requestSponsorConnection(mock.client, SPEAKER_ID, SPONSOR_ID);
    expect(result.error?.code).toBe("conflict");
    expect(result.error?.message).toContain("active");
  });

  it("returns conflict when pending request already exists", async () => {
    mock.whenTable("sponsor_accounts").returns({ data: { id: SPONSOR_ID }, error: null });
    mock.whenTable("sponsor_connections").returns({
      data: { id: "conn-existing", status: "pending" },
      error: null,
    });

    const result = await requestSponsorConnection(mock.client, SPEAKER_ID, SPONSOR_ID);
    expect(result.error?.code).toBe("conflict");
    expect(result.error?.message).toContain("pending");
  });

  it("reactivates a declined connection", async () => {
    mock.whenTable("sponsor_accounts").returns({ data: { id: SPONSOR_ID }, error: null });
    mock.whenTable("sponsor_connections").returnsSequence([
      { data: { id: "conn-old", status: "declined" }, error: null },
      { data: null, error: null }, // update
    ]);

    const result = await requestSponsorConnection(mock.client, SPEAKER_ID, SPONSOR_ID);
    expect(result.error).toBeUndefined();
    expect(result.data?.connectionId).toBe("conn-old");
  });
});

describe("endSpeakerSponsorConnection", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("ends an active connection", async () => {
    mock.whenTable("sponsor_connections").returnsSequence([
      { data: { id: "conn-1", status: "active", speaker_id: SPEAKER_ID }, error: null },
      { data: null, error: null },
    ]);

    const result = await endSpeakerSponsorConnection(mock.client, SPEAKER_ID, "conn-1");
    expect(result.error).toBeUndefined();
  });

  it("returns not_found when connection doesn't exist", async () => {
    mock.whenTable("sponsor_connections").returns({ data: null, error: null });

    const result = await endSpeakerSponsorConnection(mock.client, SPEAKER_ID, "no-conn");
    expect(result.error?.code).toBe("not_found");
  });

  it("returns validation_error for non-active connection", async () => {
    mock.whenTable("sponsor_connections").returns({
      data: { id: "conn-1", status: "pending", speaker_id: SPEAKER_ID },
      error: null,
    });

    const result = await endSpeakerSponsorConnection(mock.client, SPEAKER_ID, "conn-1");
    expect(result.error?.code).toBe("validation_error");
  });
});

describe("respondToConnection", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("accepts a pending connection", async () => {
    mock.whenTable("sponsor_connections").returnsSequence([
      { data: { id: "conn-1", status: "pending", sponsor_id: SPONSOR_ID }, error: null },
      { data: null, error: null },
    ]);

    const result = await respondToConnection(mock.client, SPONSOR_ID, "conn-1", true);
    expect(result.error).toBeUndefined();
  });

  it("declines a pending connection", async () => {
    mock.whenTable("sponsor_connections").returnsSequence([
      { data: { id: "conn-1", status: "pending", sponsor_id: SPONSOR_ID }, error: null },
      { data: null, error: null },
    ]);

    const result = await respondToConnection(mock.client, SPONSOR_ID, "conn-1", false);
    expect(result.error).toBeUndefined();
  });

  it("returns not_found when connection doesn't exist", async () => {
    mock.whenTable("sponsor_connections").returns({ data: null, error: null });

    const result = await respondToConnection(mock.client, SPONSOR_ID, "no-conn", true);
    expect(result.error?.code).toBe("not_found");
  });

  it("returns validation_error for non-pending connection", async () => {
    mock.whenTable("sponsor_connections").returns({
      data: { id: "conn-1", status: "active", sponsor_id: SPONSOR_ID },
      error: null,
    });

    const result = await respondToConnection(mock.client, SPONSOR_ID, "conn-1", true);
    expect(result.error?.code).toBe("validation_error");
  });
});

describe("endSponsorConnection", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("ends an active connection from sponsor side", async () => {
    mock.whenTable("sponsor_connections").returnsSequence([
      { data: { id: "conn-1", status: "active", sponsor_id: SPONSOR_ID }, error: null },
      { data: null, error: null },
    ]);

    const result = await endSponsorConnection(mock.client, SPONSOR_ID, "conn-1");
    expect(result.error).toBeUndefined();
  });

  it("returns validation_error for pending connection", async () => {
    mock.whenTable("sponsor_connections").returns({
      data: { id: "conn-1", status: "pending", sponsor_id: SPONSOR_ID },
      error: null,
    });

    const result = await endSponsorConnection(mock.client, SPONSOR_ID, "conn-1");
    expect(result.error?.code).toBe("validation_error");
  });
});

describe("listSponsorConnections", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("returns connections on success", async () => {
    const connections = [
      { id: "c1", speaker_id: "s1", status: "active" },
      { id: "c2", speaker_id: "s2", status: "pending" },
    ];
    mock.whenTable("sponsor_connections").returns({ data: connections, error: null });

    const result = await listSponsorConnections(mock.client, SPONSOR_ID);
    expect(result.data).toHaveLength(2);
  });

  it("returns empty array on null data", async () => {
    mock.whenTable("sponsor_connections").returns({ data: null, error: null });

    const result = await listSponsorConnections(mock.client, SPONSOR_ID);
    expect(result.data).toEqual([]);
  });

  it("returns internal_error on failure", async () => {
    mock.whenTable("sponsor_connections").returns({
      data: null,
      error: { code: "42P01", message: "table not found" },
    });

    const result = await listSponsorConnections(mock.client, SPONSOR_ID);
    expect(result.error?.code).toBe("internal_error");
  });
});
