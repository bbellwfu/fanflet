import { describe, it, expect } from "vitest";
import { ok, err } from "../types";

describe("ok()", () => {
  it("wraps data with no error", () => {
    const result = ok({ id: "abc" });
    expect(result.data).toEqual({ id: "abc" });
    expect(result.error).toBeUndefined();
  });

  it("works with void", () => {
    const result = ok(undefined);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });
});

describe("err()", () => {
  it("returns error with code and message", () => {
    const result = err("not_found", "Fanflet not found");
    expect(result.data).toBeUndefined();
    expect(result.error?.code).toBe("not_found");
    expect(result.error?.message).toBe("Fanflet not found");
  });

  it("includes extra fields for upgrade_required", () => {
    const result = err("upgrade_required", "Need pro plan", {
      feature: "analytics",
      currentPlan: "free",
    });
    expect(result.error?.feature).toBe("analytics");
    expect(result.error?.currentPlan).toBe("free");
  });
});
