import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./mock-supabase";
import {
  createFanflet,
  publishFanflet,
  unpublishFanflet,
  updateFanfletDetails,
  cloneFanflet,
  getFanflet,
  listFanflets,
} from "../fanflets";
import type { SpeakerEntitlements } from "../types";

const SPEAKER_ID = "speaker-123";

function makeEntitlements(overrides?: Partial<SpeakerEntitlements>): SpeakerEntitlements {
  return {
    features: new Set(["basic"]),
    limits: { max_fanflets: 5 },
    planName: "free",
    planDisplayName: "Free",
    ...overrides,
  };
}

describe("createFanflet", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("succeeds when under the limit and slug is available", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 2 },
      { data: null, error: null },
      { data: { id: "new-id", slug: "my-talk" }, error: null },
    ]);

    const result = await createFanflet(mock.client, SPEAKER_ID, makeEntitlements(), {
      title: "My Talk",
      event_name: "Conference 2026",
      slug: "my-talk",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ id: "new-id", slug: "my-talk" });
  });

  it("returns limit_reached when at plan maximum", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 5 },
    ]);

    const result = await createFanflet(mock.client, SPEAKER_ID, makeEntitlements({ limits: { max_fanflets: 5 } }), {
      title: "One Too Many",
      event_name: "Conf",
      slug: "too-many",
    });

    expect(result.error?.code).toBe("limit_reached");
    expect(result.error?.message).toContain("5");
  });

  it("skips limit check when max_fanflets is -1 (unlimited)", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null },
      { data: { id: "new", slug: "s" }, error: null },
    ]);

    const result = await createFanflet(
      mock.client,
      SPEAKER_ID,
      makeEntitlements({ limits: { max_fanflets: -1 } }),
      { title: "Unlimited", event_name: "Conf", slug: "s" }
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe("new");
  });

  it("returns conflict when slug already exists", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 1 },
      { data: { id: "existing" }, error: null },
    ]);

    const result = await createFanflet(mock.client, SPEAKER_ID, makeEntitlements(), {
      title: "Dupe Slug",
      event_name: "Conf",
      slug: "taken-slug",
    });

    expect(result.error?.code).toBe("conflict");
    expect(result.error?.message).toContain("slug");
  });

  it("returns internal_error when insert fails", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 0 },
      { data: null, error: null },
      { data: null, error: { code: "23505", message: "unique violation" } },
    ]);

    const result = await createFanflet(mock.client, SPEAKER_ID, makeEntitlements(), {
      title: "Fail",
      event_name: "Conf",
      slug: "fail",
    });

    expect(result.error?.code).toBe("internal_error");
  });
});

describe("publishFanflet", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("publishes and returns firstPublished=true when no other published fanflets", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 0 },
      { data: null, error: null },
    ]);

    const result = await publishFanflet(mock.client, SPEAKER_ID, "fan-1");

    expect(result.error).toBeUndefined();
    expect(result.data?.firstPublished).toBe(true);
  });

  it("returns firstPublished=false when there are existing published fanflets", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 3 },
      { data: null, error: null },
    ]);

    const result = await publishFanflet(mock.client, SPEAKER_ID, "fan-2");

    expect(result.error).toBeUndefined();
    expect(result.data?.firstPublished).toBe(false);
  });

  it("calls computeExpirationDate when preset is 30d/60d/90d", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 0 },
      { data: { expiration_preset: "30d" }, error: null },
      { data: null, error: null },
    ]);

    const computeFn = (preset: string, _: string | null, ref: Date) =>
      new Date(ref.getTime() + 30 * 86_400_000).toISOString();

    const result = await publishFanflet(mock.client, SPEAKER_ID, "fan-1", computeFn);
    expect(result.error).toBeUndefined();
  });
});

describe("unpublishFanflet", () => {
  it("returns ok on success", async () => {
    const mock = createMockSupabase();
    mock.whenTable("fanflets").returns({ data: null, error: null });

    const result = await unpublishFanflet(mock.client, "fan-1");
    expect(result.error).toBeUndefined();
  });

  it("returns internal_error on failure", async () => {
    const mock = createMockSupabase();
    mock.whenTable("fanflets").returns({
      data: null,
      error: { code: "PGRST", message: "update failed" },
    });

    const result = await unpublishFanflet(mock.client, "fan-1");
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("updateFanfletDetails", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("succeeds when no slug conflict", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null },
      { data: null, error: null },
    ]);

    const result = await updateFanfletDetails(mock.client, SPEAKER_ID, "fan-1", {
      title: "Updated Title",
      slug: "new-slug",
    });

    expect(result.error).toBeUndefined();
  });

  it("returns conflict when slug is taken by another fanflet", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: { id: "other-fanflet" }, error: null },
    ]);

    const result = await updateFanfletDetails(mock.client, SPEAKER_ID, "fan-1", {
      slug: "taken-slug",
    });

    expect(result.error?.code).toBe("conflict");
  });

  it("skips slug check when slug is not being changed", async () => {
    mock.whenTable("fanflets").returns({ data: null, error: null });

    const result = await updateFanfletDetails(mock.client, SPEAKER_ID, "fan-1", {
      title: "Just a title change",
    });

    expect(result.error).toBeUndefined();
  });
});

describe("getFanflet", () => {
  it("returns the fanflet data on success", async () => {
    const mock = createMockSupabase();
    const fanflet = { id: "fan-1", title: "Test", resource_blocks: [] };
    mock.whenTable("fanflets").returns({ data: fanflet, error: null });

    const result = await getFanflet(mock.client, "fan-1");
    expect(result.data).toEqual(fanflet);
  });

  it("returns not_found on error", async () => {
    const mock = createMockSupabase();
    mock.whenTable("fanflets").returns({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const result = await getFanflet(mock.client, "no-such-id");
    expect(result.error?.code).toBe("not_found");
  });
});

describe("listFanflets", () => {
  it("returns an array of fanflets", async () => {
    const mock = createMockSupabase();
    const fanflets = [
      { id: "f1", title: "Talk A", slug: "a" },
      { id: "f2", title: "Talk B", slug: "b" },
    ];
    mock.whenTable("fanflets").returns({ data: fanflets, error: null });

    const result = await listFanflets(mock.client, SPEAKER_ID);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toHaveProperty("id", "f1");
  });

  it("returns empty array when no fanflets exist", async () => {
    const mock = createMockSupabase();
    mock.whenTable("fanflets").returns({ data: null, error: null });

    const result = await listFanflets(mock.client, SPEAKER_ID);
    expect(result.data).toEqual([]);
  });

  it("returns internal_error on db failure", async () => {
    const mock = createMockSupabase();
    mock.whenTable("fanflets").returns({
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    const result = await listFanflets(mock.client, SPEAKER_ID);
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("cloneFanflet", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("clones a fanflet with a -copy slug", async () => {
    const source = {
      id: "src-1",
      speaker_id: SPEAKER_ID,
      title: "Original",
      description: "Desc",
      event_name: "Conf",
      event_date: null,
      slug: "original",
      theme_config: {},
      survey_question_id: null,
      expiration_date: null,
      expiration_preset: "none",
      show_expiration_notice: true,
    };

    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 1 },
      { data: source, error: null },
      { data: null, error: null },
      { data: { id: "clone-1", slug: "original-copy" }, error: null },
    ]);

    mock.whenTable("resource_blocks").returnsSequence([
      {
        data: [
          { library_item_id: null, type: "link", title: "Resource", description: null, url: "https://example.com", file_path: null, image_url: null, display_order: 0, section_name: null, metadata: {} },
        ],
        error: null,
      },
      { data: null, error: null },
    ]);

    const result = await cloneFanflet(mock.client, SPEAKER_ID, makeEntitlements(), "src-1");
    expect(result.error).toBeUndefined();
    expect(result.data?.slug).toBe("original-copy");
  });

  it("returns limit_reached when at plan cap", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 5 },
    ]);

    const result = await cloneFanflet(
      mock.client,
      SPEAKER_ID,
      makeEntitlements({ limits: { max_fanflets: 5 } }),
      "src-1"
    );

    expect(result.error?.code).toBe("limit_reached");
  });

  it("returns not_found when source doesn't exist", async () => {
    mock.whenTable("fanflets").returnsSequence([
      { data: null, error: null, count: 0 },
      { data: null, error: { code: "PGRST116", message: "not found" } },
    ]);

    const result = await cloneFanflet(mock.client, SPEAKER_ID, makeEntitlements(), "no-such-id");
    expect(result.error?.code).toBe("not_found");
  });
});
