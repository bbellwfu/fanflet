/**
 * Minimal markdown-to-HTML for announcement emails.
 * Handles: bold, links, headings (##, ###), unordered lists, paragraphs.
 * For anything richer, swap in a full library (e.g. marked).
 */
export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (trimmed.startsWith("### ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h3>${inlineFormat(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h2>${inlineFormat(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { htmlLines.push("<ul>"); inList = true; }
      htmlLines.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
    } else {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<p>${inlineFormat(trimmed)}</p>`);
    }
  }

  if (inList) htmlLines.push("</ul>");
  return htmlLines.join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
