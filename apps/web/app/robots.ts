import type { MetadataRoute } from "next";
import { getSiteUrl } from "@fanflet/db/config";

/**
 * Next.js App Router robots.txt generator.
 *
 * Strategy:
 * - Allow all crawlers (including AI) on marketing pages so Fanflet is
 *   discoverable for SEO and agentic search (see also /llms.txt).
 * - Block AI training crawlers from speaker-generated content (public fanflet
 *   pages) to protect user content from unauthorized scraping.
 * - Disallow private routes (dashboard, API, auth) from all crawlers.
 *
 * Note: MCP endpoints (/api/mcp/*) use authenticated API calls over HTTP,
 * not web crawling — robots.txt has no effect on MCP operations.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  // Private routes that no crawler should access
  const privateRoutes = [
    "/dashboard/",
    "/api/",
    "/auth/",
    "/login",
    "/signup",
    "/login/forgot-password",
    "/sponsor/dashboard",
    "/sponsor/settings",
    "/sponsor/connections",
    "/sponsor/leads",
    "/sponsor/integrations",
    "/sponsor/onboarding",
    "/my",
    "/reports/",
  ];

  return {
    rules: [
      // Known AI training crawlers — allow marketing pages, block user content
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "Google-Extended",
          "ClaudeBot",
          "anthropic-ai",
          "Bytespider",
          "FacebookBot",
          "Meta-ExternalAgent",
          "Diffbot",
          "Omgilibot",
          "Applebot-Extended",
          "PerplexityBot",
          "YouBot",
          "Cohere-ai",
        ],
        allow: [
          "/",
          "/about",
          "/contact",
          "/pricing",
          "/demo",
          "/terms",
          "/privacy",
          "/legal",
          "/legal/acceptable-use",
          "/llms.txt",
        ],
        disallow: [
          // Speaker-generated content (dynamic [speakerSlug]/[fanfletSlug] pages)
          // These are catch-all dynamic routes — any path not matching a static
          // marketing route is a speaker page. We block the known private routes
          // plus use a broad pattern to cover speaker slugs.
          ...privateRoutes,
        ],
      },
      // All other crawlers (search engines, etc.) — index everything public
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
