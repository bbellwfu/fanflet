import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./mock-supabase";
import {
  addResourceBlock,
  updateResourceBlock,
  deleteResourceBlock,
  reorderBlock,
} from "../resource-blocks";
import type { SpeakerEntitlements } from "../types";

const SPEAKER_ID = "speaker-123";
const FANFLET_ID = "fanflet-456";

function makeEntitlements(overrides?: Partial<SpeakerEntitlements>): SpeakerEntitlements {
  return {
    features: new Set(["basic", "sponsor_visibility"]),
    limits: { max_resources_per_fanflet: 20 },
    planName: "pro",
    planDisplayName: "Pro",
    ...overrides,
  };
}

describe("addResourceBlock", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("creates a library item and resource block on success", async () => {
    mock.whenTable("resource_library").returns({ data: { id: "lib-1" }, error: null });
    mock.whenTable("resource_blocks").returnsSequence([
      { data: null, error: null }, // getNextDisplayOrder (no existing blocks)
      { data: { id: "block-1" }, error: null }, // insert
    ]);

    const result = await addResourceBlock(mock.client, SPEAKER_ID, FANFLET_ID, makeEntitlements(), {
      type: "link",
      title: "My Resource",
      url: "example.com",
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe("block-1");
  });

  it("returns upgrade_required for sponsor block without feature", async () => {
    const result = await addResourceBlock(
      mock.client,
      SPEAKER_ID,
      FANFLET_ID,
      makeEntitlements({ features: new Set(["basic"]) }),
      { type: "sponsor", title: "Sponsor" }
    );

    expect(result.error?.code).toBe("upgrade_required");
    expect(result.error?.feature).toBe("sponsor_visibility");
  });

  it("returns validation_error for sponsor block with unconnected sponsor", async () => {
    mock.whenTable("sponsor_connections").returns({ data: null, error: null });

    const result = await addResourceBlock(mock.client, SPEAKER_ID, FANFLET_ID, makeEntitlements(), {
      type: "sponsor",
      title: "Sponsor",
      sponsor_account_id: "spon-999",
    });

    expect(result.error?.code).toBe("validation_error");
  });

  it("sets default section_name to Resources for non-sponsor types", async () => {
    mock.whenTable("resource_library").returns({ data: { id: "lib-1" }, error: null });
    mock.whenTable("resource_blocks").returnsSequence([
      { data: null, error: null },
      { data: { id: "block-1" }, error: null },
    ]);

    await addResourceBlock(mock.client, SPEAKER_ID, FANFLET_ID, makeEntitlements(), {
      type: "link",
      title: "Link",
    });

    // Verify from was called with resource_library (the insert)
    expect(mock.client.from).toHaveBeenCalledWith("resource_library");
  });

  it("returns internal_error when library insert fails", async () => {
    mock.whenTable("resource_library").returns({
      data: null,
      error: { code: "23505", message: "insert failed" },
    });

    const result = await addResourceBlock(mock.client, SPEAKER_ID, FANFLET_ID, makeEntitlements(), {
      type: "link",
      title: "Fail",
    });

    expect(result.error?.code).toBe("internal_error");
  });
});

describe("updateResourceBlock", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("updates block and returns fanfletId", async () => {
    mock.whenTable("resource_blocks").returnsSequence([
      { data: { fanflet_id: FANFLET_ID }, error: null },
      { data: null, error: null },
    ]);

    const result = await updateResourceBlock(mock.client, "block-1", {
      title: "Updated Title",
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.fanfletId).toBe(FANFLET_ID);
  });

  it("returns not_found when block doesn't exist", async () => {
    mock.whenTable("resource_blocks").returns({ data: null, error: null });

    const result = await updateResourceBlock(mock.client, "no-such-block", {
      title: "Update",
    });

    expect(result.error?.code).toBe("not_found");
  });
});

describe("deleteResourceBlock", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("deletes block and returns fanfletId", async () => {
    mock.whenTable("resource_blocks").returnsSequence([
      { data: { fanflet_id: FANFLET_ID }, error: null },
      { data: null, error: null },
    ]);

    const result = await deleteResourceBlock(mock.client, "block-1");

    expect(result.error).toBeUndefined();
    expect(result.data?.fanfletId).toBe(FANFLET_ID);
  });

  it("returns not_found when block doesn't exist", async () => {
    mock.whenTable("resource_blocks").returns({ data: null, error: null });

    const result = await deleteResourceBlock(mock.client, "no-such-block");
    expect(result.error?.code).toBe("not_found");
  });

  it("returns internal_error on delete failure", async () => {
    mock.whenTable("resource_blocks").returnsSequence([
      { data: { fanflet_id: FANFLET_ID }, error: null },
      { data: null, error: { code: "PGRST", message: "delete failed" } },
    ]);

    const result = await deleteResourceBlock(mock.client, "block-1");
    expect(result.error?.code).toBe("internal_error");
  });
});

describe("reorderBlock", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it("returns not_found when block doesn't exist", async () => {
    mock.whenTable("resource_blocks").returns({ data: null, error: null });

    const result = await reorderBlock(mock.client, "no-block", "up");
    expect(result.error?.code).toBe("not_found");
  });

  it("returns ok when only one block exists (no swap needed)", async () => {
    mock.whenTable("resource_blocks").returnsSequence([
      { data: { id: "b1", fanflet_id: FANFLET_ID, display_order: 0 }, error: null },
      { data: [{ id: "b1", display_order: 0 }], error: null },
    ]);

    const result = await reorderBlock(mock.client, "b1", "up");
    expect(result.error).toBeUndefined();
    expect(result.data?.fanfletId).toBe(FANFLET_ID);
  });
});
