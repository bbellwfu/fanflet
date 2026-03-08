/**
 * Minimal markdown-to-HTML converter for legal documents.
 * Handles headings, paragraphs, lists, blockquotes, bold, links, and tables.
 * Server-only — used by legal page server components.
 */

import { readFile } from "fs/promises";
import path from "path";

/**
 * Read a legal markdown file from docs/legal/ and convert to HTML.
 * Strips the title, effective/updated date lines, and front-matter separators
 * since these are rendered separately in the page layout.
 */
export async function loadLegalMarkdown(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "..", "docs", "legal", filename);
  const markdown = await readFile(filePath, "utf-8");

  const lines = markdown.split("\n");
  const contentStart = lines.findIndex((l, i) => i > 0 && l.startsWith("---"));
  const content = contentStart >= 0
    ? lines.slice(contentStart + 1).join("\n").trim()
    : lines.join("\n").trim();

  const cleaned = content
    .replace(/^#\s+.*\n/m, "")
    .replace(/^\*\*Effective Date:\*\*.*\n/m, "")
    .replace(/^\*\*Last Updated:\*\*.*\n/m, "")
    .replace(/^---\s*$/m, "")
    .trim();

  return markdownToHtml(cleaned);
}

function markdownToHtml(md: string): string {
  let html = md;

  // Tables
  html = html.replace(
    /^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_match, header: string, _sep: string, body: string) => {
      const headers = header
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${inlineFormat(c.trim())}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Blockquotes
  html = html.replace(/^(?:>\s?.+\n?)+/gm, (block) => {
    const inner = block.replace(/^>\s?/gm, "").trim();
    return `<blockquote>${inlineFormat(inner)}</blockquote>\n`;
  });

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");

  // Unordered lists
  html = html.replace(/^(?:- .+\n?)+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li>${inlineFormat(line.replace(/^- /, ""))}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/^(?:\d+\.\s.+\n?)+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li>${inlineFormat(line.replace(/^\d+\.\s/, ""))}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // Paragraphs — wrap remaining loose text lines
  html = html.replace(/^(?!<[a-z])((?!<).+)$/gm, (_, text) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    return `<p>${inlineFormat(trimmed)}</p>`;
  });

  // Clean up excessive blank lines
  html = html.replace(/\n{3,}/g, "\n\n");

  return html;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
