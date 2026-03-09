import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

interface WorklogFeature {
  name: string;
  description: string;
}

interface WorklogEntry {
  filename: string;
  date: string;
  dateLabel: string;
  titleSummary: string;
  overviewParagraph: string;
  features: WorklogFeature[];
  bugFixes: string[];
  infrastructure: string[];
}

const WORKLOG_DIR = resolve(__dirname, "../../../worklog");
const OUTPUT_DIR = resolve(__dirname, "../generated");
const OUTPUT_FILE = join(OUTPUT_DIR, "worklog-index.json");

function parseDateFromFilename(filename: string): {
  date: string;
  dateLabel: string;
} | null {
  const match = filename.match(/^(\d{6})\s/);
  if (!match) return null;

  const raw = match[1];
  const yy = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const dd = raw.slice(4, 6);
  const isoDate = `20${yy}-${mm}-${dd}`;

  const d = new Date(`${isoDate}T12:00:00Z`);
  const dateLabel = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return { date: isoDate, dateLabel };
}

function parseTitleSummary(filename: string): string {
  return filename.replace(/^\d{6}\s+/, "").replace(/\.md$/, "");
}

function extractSection(
  content: string,
  sectionHeader: string
): string | null {
  const headerPattern = new RegExp(
    `^###?\\s+${sectionHeader}\\s*$`,
    "m"
  );
  const match = content.match(headerPattern);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[0].length;
  const nextSectionMatch = content
    .slice(start)
    .match(/^#{1,3}\s+\S/m);
  const end = nextSectionMatch?.index
    ? start + nextSectionMatch.index
    : undefined;

  return content.slice(start, end).trim();
}

function parseOverview(content: string): string {
  const releaseSummaryMatch = content.match(
    /^##\s+Release Summary\s*$/m
  );
  if (!releaseSummaryMatch || releaseSummaryMatch.index === undefined)
    return "";

  const afterHeader =
    releaseSummaryMatch.index + releaseSummaryMatch[0].length;
  const nextSectionMatch = content
    .slice(afterHeader)
    .match(/^###?\s+\S/m);
  const sectionEnd = nextSectionMatch?.index
    ? afterHeader + nextSectionMatch.index
    : undefined;

  const block = content.slice(afterHeader, sectionEnd).trim();
  const lines = block.split("\n").filter((l) => l.trim().length > 0);
  return lines.join(" ").trim();
}

function parseFeatures(content: string): WorklogFeature[] {
  const section = extractSection(content, "New Features");
  if (!section) return [];

  const features: WorklogFeature[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let match: RegExpExecArray | null;
  const positions: { name: string; start: number; end: number }[] = [];

  while ((match = boldPattern.exec(section)) !== null) {
    positions.push({
      name: match[1],
      start: match.index + match[0].length,
      end: section.length,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const end =
      i + 1 < positions.length
        ? section.lastIndexOf("**", positions[i + 1].start - positions[i + 1].name.length - 4)
        : section.length;
    const descBlock = section.slice(positions[i].start, end).trim();
    const description = descBlock
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("**"))
      .join(" ")
      .trim();

    if (positions[i].name && description) {
      features.push({ name: positions[i].name, description });
    }
  }

  return features;
}

function parseBulletList(content: string, sectionName: string): string[] {
  const section = extractSection(content, sectionName);
  if (!section) return [];

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function parseWorklog(filename: string, content: string): WorklogEntry | null {
  const dateInfo = parseDateFromFilename(filename);
  if (!dateInfo) return null;

  return {
    filename,
    date: dateInfo.date,
    dateLabel: dateInfo.dateLabel,
    titleSummary: parseTitleSummary(filename),
    overviewParagraph: parseOverview(content),
    features: parseFeatures(content),
    bugFixes: parseBulletList(content, "Bug Fixes"),
    infrastructure: parseBulletList(content, "Infrastructure"),
  };
}

function main() {
  let files: string[];
  try {
    files = readdirSync(WORKLOG_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    console.log("No worklog directory found, writing empty index.");
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));
    return;
  }

  const entries: WorklogEntry[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(WORKLOG_DIR, file), "utf-8");
      const entry = parseWorklog(file, content);
      if (entry) {
        entries.push(entry);
      } else {
        console.warn(`Skipping ${file}: could not parse date from filename`);
      }
    } catch (err) {
      console.warn(`Skipping ${file}: ${(err as Error).message}`);
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
  console.log(
    `Indexed ${entries.length} worklog(s) → ${OUTPUT_FILE}`
  );
}

main();
