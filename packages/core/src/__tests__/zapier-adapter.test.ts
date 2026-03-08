import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { zapierAdapter } from "../integrations/zapier";
import type { ConnectionConfig, PushContext } from "../integrations/types";

function makeConnection(overrides?: Partial<ConnectionConfig>): ConnectionConfig {
  return {
    connectionId: "conn-1",
    sponsorId: "sponsor-1",
    platform: "zapier",
    settings: {},
    webhookUrls: ["https://hooks.zapier.com/test/123"],
    ...overrides,
  };
}

function makeCtx(overrides?: Partial<PushContext>): PushContext {
  return {
    connection: makeConnection(),
    eventType: "lead.captured",
    payload: { email: "test@example.com", name: "Test User" },
    ...overrides,
  };
}

describe("zapierAdapter.push", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends JSON payload to the webhook URL", async () => {
    const result = await zapierAdapter.push(makeCtx());

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe("https://hooks.zapier.com/test/123");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(callArgs[1].body);
    expect(body.event_type).toBe("lead.captured");
    expect(body.sponsor_id).toBe("sponsor-1");
    expect(body.data).toEqual({ email: "test@example.com", name: "Test User" });
    expect(body.timestamp).toBeDefined();
  });

  it("returns error when no webhook URLs configured", async () => {
    const ctx = makeCtx({
      connection: makeConnection({ webhookUrls: [] }),
    });

    const result = await zapierAdapter.push(ctx);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.errorMessage).toContain("No webhook URLs");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends to multiple webhook URLs in parallel", async () => {
    const ctx = makeCtx({
      connection: makeConnection({
        webhookUrls: [
          "https://hooks.zapier.com/test/1",
          "https://hooks.zapier.com/test/2",
        ],
      }),
    });

    const result = await zapierAdapter.push(ctx);

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reports partial success (207) when some webhooks fail", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = makeCtx({
      connection: makeConnection({
        webhookUrls: [
          "https://hooks.zapier.com/test/good",
          "https://hooks.zapier.com/test/bad",
        ],
      }),
    });

    const result = await zapierAdapter.push(ctx);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(207);
    expect(result.responseBody).toContain("1/2");
  });

  it("marks 5xx errors as retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve("Service Unavailable"),
      })
    );

    const result = await zapierAdapter.push(makeCtx());

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(503);
  });

  it("marks 4xx errors (except 429) as non-retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      })
    );

    const result = await zapierAdapter.push(makeCtx());

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
  });

  it("marks 429 (rate limit) as retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Too Many Requests"),
      })
    );

    const result = await zapierAdapter.push(makeCtx());

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });

  it("handles network errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network unreachable"))
    );

    const result = await zapierAdapter.push(makeCtx());

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.errorMessage).toContain("Network unreachable");
  });
});

describe("zapierAdapter.healthCheck", () => {
  it("returns healthy when webhook URLs are valid", async () => {
    const result = await zapierAdapter.healthCheck(makeConnection());

    expect(result.healthy).toBe(true);
    expect(result.suggestedStatus).toBe("connected");
  });

  it("returns unhealthy when no webhook URLs", async () => {
    const result = await zapierAdapter.healthCheck(
      makeConnection({ webhookUrls: [] })
    );

    expect(result.healthy).toBe(false);
    expect(result.suggestedStatus).toBe("degraded");
  });

  it("returns unhealthy when webhook URL is invalid", async () => {
    const result = await zapierAdapter.healthCheck(
      makeConnection({ webhookUrls: ["not-a-url"] })
    );

    expect(result.healthy).toBe(false);
    expect(result.suggestedStatus).toBe("degraded");
    expect(result.errorMessage).toContain("Invalid webhook URL");
  });
});
