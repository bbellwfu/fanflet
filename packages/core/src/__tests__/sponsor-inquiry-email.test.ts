import { describe, it, expect } from "vitest";
import { renderSponsorInquiryConfirmation } from "../sponsor-inquiry-email";

describe("renderSponsorInquiryConfirmation", () => {
  it("renders a complete HTML email", () => {
    const html = renderSponsorInquiryConfirmation("Bob Smith");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("We received your inquiry");
    expect(html).toContain("Bob Smith");
    expect(html).toContain("fanflet.com");
  });

  it("includes the CTA button", () => {
    const html = renderSponsorInquiryConfirmation("Test User");
    expect(html).toContain("Learn more about Fanflet");
  });

  it("escapes HTML in recipient name", () => {
    const html = renderSponsorInquiryConfirmation('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("mentions 1-2 business days turnaround", () => {
    const html = renderSponsorInquiryConfirmation("Jane");
    expect(html).toContain("1\u20132 business days");
  });
});
