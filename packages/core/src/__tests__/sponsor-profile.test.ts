import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./mock-supabase";
import {
  getSponsorProfile,
  updateSponsorProfile,
  checkSponsorSlugAvailability,
  updateSponsorLogo,
  removeSponsorLogo,
} from "../sponsor-profile";

const SPONSOR_ID = "sponsor-123";

describe("getSponsorProfile", () => {
  it("returns profile data on success", async () => {
    const mock = createMockSupabase();
    const profile = { id: SPONSOR_ID, company_name: "Acme Corp" };
    mock.whenTable("sponsor_accounts").returns({ data: profile, error: null });

    const result = await getSponsorProfile(mock.client, SPONSOR_ID);
    expect(result.data).toEqual(profile);
  });

  it("returns not_found on error", async () => {
    const mock = createMockSupabase();
    mock.whenTable("sponsor_accounts").returns({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const result = await getSponsorProfile(mock.client, SPONSOR_ID);
    expect(result.error?.code).toBe("not_found");
  });
});

describe("updateSponsorProfile", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("updates profile successfully without slug change", async () => {
    mock.whenTable("sponsor_accounts").returns({ data: null, error: null });

    const result = await updateSponsorProfile(mock.client, SPONSOR_ID, {
      company_name: "New Name",
    });
    expect(result.error).toBeUndefined();
  });

  it("updates profile with unique slug", async () => {
    mock.whenTable("sponsor_accounts").returnsSequence([
      { data: null, error: null }, // slug check — no conflict
      { data: null, error: null }, // update
    ]);

    const result = await updateSponsorProfile(mock.client, SPONSOR_ID, {
      slug: "new-slug",
    });
    expect(result.error).toBeUndefined();
  });

  it("returns conflict when slug is taken", async () => {
    mock.whenTable("sponsor_accounts").returns({
      data: { id: "other-sponsor" },
      error: null,
    });

    const result = await updateSponsorProfile(mock.client, SPONSOR_ID, {
      slug: "taken-slug",
    });
    expect(result.error?.code).toBe("conflict");
  });

  it("returns internal_error on update failure", async () => {
    mock.whenTable("sponsor_accounts").returnsSequence([
      { data: null, error: null }, // slug check
      { data: null, error: { code: "PGRST", message: "update failed" } },
    ]);

    const result = await updateSponsorProfile(mock.client, SPONSOR_ID, {
      slug: "ok-slug",
      description: "New desc",
    });
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("checkSponsorSlugAvailability", () => {
  it("returns available=true when slug is free", async () => {
    const mock = createMockSupabase();
    mock.whenTable("sponsor_accounts").returns({ data: null, error: null });

    const result = await checkSponsorSlugAvailability(mock.client, SPONSOR_ID, "free-slug");
    expect(result.data?.available).toBe(true);
  });

  it("returns available=false when slug is taken", async () => {
    const mock = createMockSupabase();
    mock.whenTable("sponsor_accounts").returns({
      data: { id: "other" },
      error: null,
    });

    const result = await checkSponsorSlugAvailability(mock.client, SPONSOR_ID, "taken-slug");
    expect(result.data?.available).toBe(false);
  });
});

describe("updateSponsorLogo", () => {
  it("updates logo URL on success", async () => {
    const mock = createMockSupabase();
    mock.whenTable("sponsor_accounts").returns({ data: null, error: null });

    const result = await updateSponsorLogo(mock.client, SPONSOR_ID, "https://cdn.example.com/logo.png");
    expect(result.error).toBeUndefined();
  });

  it("returns internal_error on failure", async () => {
    const mock = createMockSupabase();
    mock.whenTable("sponsor_accounts").returns({
      data: null,
      error: { code: "PGRST", message: "update failed" },
    });

    const result = await updateSponsorLogo(mock.client, SPONSOR_ID, "https://example.com/logo.png");
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("removeSponsorLogo", () => {
  it("removes logo on success", async () => {
    const mock = createMockSupabase();
    mock.whenTable("sponsor_accounts").returns({ data: null, error: null });

    const result = await removeSponsorLogo(mock.client, SPONSOR_ID);
    expect(result.error).toBeUndefined();
  });
});
