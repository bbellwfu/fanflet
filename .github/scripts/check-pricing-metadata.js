#!/usr/bin/env node
/**
 * Warns when a feature flag assigned to a public plan (free, pro, enterprise)
 * in migrations is missing from MARKETING_METADATA in feature-comparison.tsx.
 * Non-blocking: exit 0 with warning message so CI doesn't fail.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const COMPONENT_PATH = path.join(
  REPO_ROOT,
  "apps/web/components/marketing/feature-comparison.tsx"
);
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase/migrations");

const PUBLIC_PLANS = new Set(["free", "pro", "enterprise"]);

function extractMarketingMetadataKeys(content) {
  const keys = new Set();
  const re = /^\s+([a-z][a-z0-9_]*):\s*\{/gm;
  let match;
  const start = content.indexOf("const MARKETING_METADATA");
  const end = content.indexOf("};", start);
  if (start === -1 || end === -1) return keys;
  const block = content.slice(start, end);
  while ((match = re.exec(block)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function parsePlansAndKeysFromBlock(block) {
  const plans = new Set();
  const keys = new Set();
  const planRe = /p\.name\s+IN\s*\(([^)]+)\)|p\.name\s*=\s*'([^']+)'/g;
  const keyRe = /(?:f|ff)\.key\s*=\s*'([^']+)'|(?:f|ff)\.key\s+IN\s*\(([^)]+)\)/g;
  let m;
  while ((m = planRe.exec(block)) !== null) {
    if (m[1]) {
      m[1]
        .split(",")
        .map((s) => s.trim().replace(/^'|'$/g, ""))
        .forEach((p) => plans.add(p));
    } else if (m[2]) {
      plans.add(m[2]);
    }
  }
  while ((m = keyRe.exec(block)) !== null) {
    if (m[1]) keys.add(m[1]);
    else if (m[2]) {
      m[2]
        .split(",")
        .map((s) => s.trim().replace(/^'|'$/g, ""))
        .forEach((k) => keys.add(k));
    }
  }
  return { plans, keys };
}

function extractPlanFeaturePairsFromMigrations() {
  const pairs = new Set(); // "planName:featureKey"
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  for (const file of files) {
    const content = fs.readFileSync(
      path.join(MIGRATIONS_DIR, file),
      "utf8"
    );
    // Split by INSERT INTO ... plan_features so we associate each WHERE with its INSERT only
    const insertBlocks = content.split(/INSERT\s+INTO\s+public\.plan_features/i);
    for (let i = 1; i < insertBlocks.length; i++) {
      const block = insertBlocks[i];
      const { plans, keys } = parsePlansAndKeysFromBlock(block);
      for (const plan of plans) {
        for (const key of keys) {
          pairs.add(`${plan}:${key}`);
        }
      }
    }
  }
  return pairs;
}

function main() {
  const componentContent = fs.readFileSync(COMPONENT_PATH, "utf8");
  const metadataKeys = extractMarketingMetadataKeys(componentContent);
  const planFeaturePairs = extractPlanFeaturePairsFromMigrations();

  const missing = [];
  for (const pair of planFeaturePairs) {
    const [plan, key] = pair.split(":");
    if (!PUBLIC_PLANS.has(plan)) continue;
    if (!metadataKeys.has(key)) {
      missing.push(`  ${key} (on plan "${plan}")`);
    }
  }

  if (missing.length > 0) {
    console.warn(
      "check-pricing-metadata: The following feature flags are assigned to public plans in migrations but are missing from MARKETING_METADATA in feature-comparison.tsx. They will appear in the 'Other Features' catch-all; add them to MARKETING_METADATA for proper categorization and copy:"
    );
    console.warn(missing.join("\n"));
    process.exit(0); // warn only, don't fail CI
  }
}

main();
