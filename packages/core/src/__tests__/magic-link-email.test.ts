import { describe, it, expect } from "vitest";
import {
  renderMagicLinkEmail,
  buildDemoSignInEmail,
  buildPasswordResetEmail,
} from "../magic-link-email";

describe("renderMagicLinkEmail", () => {
  it("renders a complete HTML email", () => {
    const html = renderMagicLinkEmail({
      linkUrl: "https://fanflet.com/auth/confirm?token=abc",
      heading: "Sign In",
      bodyText: "Click below to sign in.",
      ctaLabel: "Sign In",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Sign In");
    expect(html).toContain("https://fanflet.com/auth/confirm?token=abc");
    expect(html).toContain("Click below to sign in.");
  });

  it("includes default expiry note", () => {
    const html = renderMagicLinkEmail({
      linkUrl: "https://example.com",
      heading: "Test",
      bodyText: "Test body",
      ctaLabel: "Click",
    });
    expect(html).toContain("expires in 1 hour");
  });

  it("uses custom expiry note when provided", () => {
    const html = renderMagicLinkEmail({
      linkUrl: "https://example.com",
      heading: "Test",
      bodyText: "Body",
      ctaLabel: "Click",
      expiryNote: "This link expires in 24 hours.",
    });
    expect(html).toContain("expires in 24 hours");
    expect(html).not.toContain("expires in 1 hour");
  });

  it("escapes HTML in user-provided content", () => {
    const html = renderMagicLinkEmail({
      linkUrl: "https://example.com",
      heading: '<script>alert("xss")</script>',
      bodyText: "Safe body",
      ctaLabel: "Click",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes fallback copy-paste link", () => {
    const html = renderMagicLinkEmail({
      linkUrl: "https://example.com/auth?token=123",
      heading: "Test",
      bodyText: "Body",
      ctaLabel: "Click",
    });
    expect(html).toContain("copy and paste this link");
  });
});

describe("buildDemoSignInEmail", () => {
  it("renders speaker portal demo email", () => {
    const html = buildDemoSignInEmail("https://fanflet.com/auth", "speaker", "Jane Doe");
    expect(html).toContain("Speaker Dashboard");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Sign In to Speaker Dashboard");
  });

  it("renders sponsor portal demo email", () => {
    const html = buildDemoSignInEmail("https://fanflet.com/auth", "sponsor", "Acme Corp");
    expect(html).toContain("Sponsor Portal");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Sign In to Sponsor Portal");
  });
});

describe("buildPasswordResetEmail", () => {
  it("renders password reset email", () => {
    const html = buildPasswordResetEmail("https://fanflet.com/reset");
    expect(html).toContain("Reset your password");
    expect(html).toContain("Reset Password");
    expect(html).toContain("https://fanflet.com/reset");
  });
});
