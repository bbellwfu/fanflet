/**
 * Security tests for MCP auth — verifies that non-admin roles receive an
 * RLS-scoped Supabase client and never the service-role client.
 *
 * These tests mock the database layer and verify the wiring in buildToolContext
 * and authenticateFromHeaders. They exist specifically to prevent regressions
 * of the service-client-bypass vulnerability fixed in PR #77.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB modules BEFORE importing auth
const mockServiceClient = { _brand: "service", from: vi.fn(), auth: { getUser: vi.fn() } };
const mockUserScopedClient = { _brand: "user-scoped", from: vi.fn() };

vi.mock("@fanflet/db/service", () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}));

const mockEntitlements = {
  features: new Set(["mcp_access", "basic_engagement_stats"]),
  limits: { max_fanflets: -1 },
  planName: "pro",
  planDisplayName: "Pro",
};

const mockSponsorEntitlements = {
  features: new Set<string>(),
  limits: { max_connections: 3, max_resources: 5, storage_mb: 50 },
  planName: "sponsor_connect",
  planDisplayName: "Sponsor Connect",
};

vi.mock("@fanflet/db", () => ({
  createUserScopedClient: vi.fn(async () => mockUserScopedClient),
  loadSpeakerEntitlements: vi.fn(async () => mockEntitlements),
  loadSponsorEntitlements: vi.fn(async () => mockSponsorEntitlements),
}));

vi.mock("../oauth", () => ({
  verifyAccessToken: vi.fn(async () => null),
}));

import { createUserScopedClient } from "@fanflet/db";

// We need to test buildToolContext indirectly through authenticateFromHeaders
// since buildToolContext is not exported. We use the JWT fallback auth path.
import { authenticateFromHeaders } from "../auth";

function makeHeadersWithJwt(token: string): Headers {
  const headers = new Headers();
  headers.set("authorization", `Bearer ${token}`);
  return headers;
}

describe("MCP auth RLS isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("speaker role", () => {
    beforeEach(() => {
      mockServiceClient.auth.getUser = vi.fn(async () => ({
        data: { user: { id: "speaker-user-id", app_metadata: {} } },
        error: null,
      }));

      mockServiceClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        })),
      }));

      // Speaker: sponsor_accounts = null, speakers = found, user_roles = null
      let callCount = 0;
      mockServiceClient.from = vi.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "sponsor_accounts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              })),
            })),
          };
        }
        if (table === "speakers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { id: "spk-1" }, error: null })),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });
    });

    it("receives an RLS-scoped client, NOT the service client", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.role).toBe("speaker");
      expect(ctx.supabase).toBe(mockUserScopedClient);
      expect(ctx.supabase).not.toBe(mockServiceClient);
      expect(ctx.serviceClient).toBe(mockServiceClient);
    });

    it("calls createUserScopedClient with the user's ID", async () => {
      await authenticateFromHeaders(makeHeadersWithJwt("some-jwt-token"));

      expect(createUserScopedClient).toHaveBeenCalledWith("speaker-user-id");
    });

    it("supabase and serviceClient are different objects", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.supabase).not.toBe(ctx.serviceClient);
    });

    it("resolves speakerId and loads entitlements", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.speakerId).toBe("spk-1");
      expect(ctx.entitlements).toBeDefined();
      expect(ctx.entitlements?.planName).toBe("pro");
      expect(ctx.entitlements?.features.has("mcp_access")).toBe(true);
    });
  });

  describe("sponsor role", () => {
    beforeEach(() => {
      mockServiceClient.auth.getUser = vi.fn(async () => ({
        data: { user: { id: "sponsor-user-id", app_metadata: {} } },
        error: null,
      }));

      mockServiceClient.from = vi.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "sponsor_accounts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { id: "spon-1" }, error: null })),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });
    });

    it("receives an RLS-scoped client, NOT the service client", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.role).toBe("sponsor");
      expect(ctx.supabase).toBe(mockUserScopedClient);
      expect(ctx.supabase).not.toBe(mockServiceClient);
    });
  });

  describe("audience role", () => {
    beforeEach(() => {
      mockServiceClient.auth.getUser = vi.fn(async () => ({
        data: { user: { id: "audience-user-id", app_metadata: {} } },
        error: null,
      }));

      mockServiceClient.from = vi.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "sponsor_accounts" || table === "speakers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });
    });

    it("receives an RLS-scoped client, NOT the service client", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.role).toBe("audience");
      expect(ctx.supabase).toBe(mockUserScopedClient);
      expect(ctx.supabase).not.toBe(mockServiceClient);
    });
  });

  describe("platform_admin role", () => {
    beforeEach(() => {
      mockServiceClient.auth.getUser = vi.fn(async () => ({
        data: {
          user: {
            id: "admin-user-id",
            app_metadata: { role: "platform_admin" },
          },
        },
        error: null,
      }));

      mockServiceClient.from = vi.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });
    });

    it("receives the service client for both fields (needs cross-tenant access)", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.role).toBe("platform_admin");
      expect(ctx.supabase).toBe(mockServiceClient);
      expect(ctx.serviceClient).toBe(mockServiceClient);
    });

    it("does NOT call createUserScopedClient", async () => {
      await authenticateFromHeaders(makeHeadersWithJwt("some-jwt-token"));

      expect(createUserScopedClient).not.toHaveBeenCalled();
    });

    it("does NOT load entitlements", async () => {
      const ctx = await authenticateFromHeaders(
        makeHeadersWithJwt("some-jwt-token")
      );

      expect(ctx.entitlements).toBeUndefined();
    });
  });
});
