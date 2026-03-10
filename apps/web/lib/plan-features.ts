/**
 * Shared plan feature metadata and comparison logic.
 * Used by both the marketing pricing page and the dashboard billing page.
 */

export interface FeatureDisplayConfig {
  label: string;
  category: string;
  sortOrder: number;
  overrides?: Record<string, string>;
}

export const FEATURE_METADATA: Record<string, FeatureDisplayConfig> = {
  personalized_branded_urls: {
    label: "Personalized branded URLs",
    category: "Content & Branding",
    sortOrder: 20,
  },
  profile_bio_photo: {
    label: "Profile and bio with photo",
    category: "Content & Branding",
    sortOrder: 30,
  },
  custom_resources_links: {
    label: "Custom resources and links",
    category: "Content & Branding",
    sortOrder: 40,
  },
  multiple_theme_colors: {
    label: "Theme colors",
    category: "Content & Branding",
    sortOrder: 50,
    overrides: { free: "1", pro: "Multiple", enterprise: "Custom" },
  },
  surveys_session_feedback: {
    label: "Surveys and session feedback",
    category: "Engagement",
    sortOrder: 10,
  },
  email_list_building: {
    label: "Opt-in email list building",
    category: "Engagement",
    sortOrder: 20,
  },
  custom_expiration: {
    label: "Fanflet expiration",
    category: "Engagement",
    sortOrder: 30,
    overrides: { free: "14 days", pro: "30, 60, 90 days", enterprise: "Custom" },
  },
  basic_engagement_stats: {
    label: "Basic engagement stats",
    category: "Analytics",
    sortOrder: 10,
  },
  click_through_analytics: {
    label: "Click-through analytics",
    category: "Analytics",
    sortOrder: 20,
  },
  advanced_reporting: {
    label: "Advanced reporting",
    category: "Analytics",
    sortOrder: 30,
  },
  email_support: {
    label: "Email support",
    category: "Support & Admin",
    sortOrder: 10,
  },
  priority_support: {
    label: "Priority support",
    category: "Support & Admin",
    sortOrder: 20,
  },
  dedicated_account_manager: {
    label: "Dedicated account manager",
    category: "Support & Admin",
    sortOrder: 30,
  },
  sso_team_management: {
    label: "SSO and team management",
    category: "Support & Admin",
    sortOrder: 40,
  },
  api_access: {
    label: "API access",
    category: "Support & Admin",
    sortOrder: 50,
  },
  mcp_access: {
    label: "MCP AI Assistant Access",
    category: "Support & Admin",
    sortOrder: 55,
  },
  sponsor_visibility: {
    label: "Sponsor visibility and links",
    category: "Sponsor & Files",
    sortOrder: 10,
  },
  file_upload: {
    label: "File upload and secure delivery",
    category: "Sponsor & Files",
    sortOrder: 20,
  },
  sponsor_reports: {
    label: "Sponsor engagement reports",
    category: "Sponsor & Files",
    sortOrder: 30,
  },
  enterprise_integrations: {
    label: "Enterprise Integrations",
    category: "Sponsor & Files",
    sortOrder: 40,
  },
};

export const CATEGORY_ORDER = [
  "Content & Branding",
  "Engagement",
  "Analytics",
  "Support & Admin",
  "Sponsor & Files",
  "Other Features",
] as const;

export const CATEGORY_STYLES: Record<
  string,
  { accentColor: string; accentColorLight: string }
> = {
  "Content & Branding": {
    accentColor: "#10B981",
    accentColorLight: "rgba(16, 185, 129, 0.06)",
  },
  Engagement: {
    accentColor: "#3B82F6",
    accentColorLight: "rgba(59, 130, 246, 0.06)",
  },
  Analytics: {
    accentColor: "#F59E0B",
    accentColorLight: "rgba(245, 158, 11, 0.06)",
  },
  "Support & Admin": {
    accentColor: "#7C3AED",
    accentColorLight: "rgba(124, 58, 237, 0.06)",
  },
  "Sponsor & Files": {
    accentColor: "#10B981",
    accentColorLight: "rgba(16, 185, 129, 0.08)",
  },
  "Other Features": {
    accentColor: "#475569",
    accentColorLight: "rgba(71, 85, 105, 0.06)",
  },
};

export const LIMIT_ROWS: {
  label: string;
  limitKey: string;
  format: (val: number) => string;
}[] = [
  {
    label: "Number of fanflets",
    limitKey: "max_fanflets",
    format: (val) => (val === -1 || val === undefined ? "Unlimited" : String(val)),
  },
];

export type CellValue = string | boolean;

export interface ComparisonPlan {
  name: string;
  display_name: string;
  limits: Record<string, number>;
}

export interface BuiltRow {
  featureKey?: string;
  featureLabel: string;
  category: string;
  values: Record<string, CellValue>;
}

export function buildPlanFeatureSets(
  plans: ComparisonPlan[],
  featureMatrix: Record<string, string[]>
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const plan of plans) {
    const keys = featureMatrix[plan.name] ?? [];
    map.set(plan.name, new Set(keys));
  }
  return map;
}

export function buildComparisonRows(
  plans: ComparisonPlan[],
  planFeatureSets: Map<string, Set<string>>,
  featureDisplayNames: Record<string, string>
): { category: string; rows: BuiltRow[] }[] {
  const mappedKeys = new Set(Object.keys(FEATURE_METADATA));
  const allKeysFromMatrix = new Set<string>();
  for (const set of planFeatureSets.values()) {
    for (const k of set) allKeysFromMatrix.add(k);
  }
  const unmappedKeys = [...allKeysFromMatrix].filter((k) => !mappedKeys.has(k));

  const categoryToRows = new Map<string, BuiltRow[]>();

  for (const limitRow of LIMIT_ROWS) {
    const values: Record<string, CellValue> = {};
    for (const plan of plans) {
      const raw = plan.limits[limitRow.limitKey];
      const num = typeof raw === "number" ? raw : undefined;
      values[plan.name] = limitRow.format(num ?? -1);
    }
    const category = "Content & Branding";
    const list = categoryToRows.get(category) ?? [];
    list.push({ featureLabel: limitRow.label, category, values });
    categoryToRows.set(category, list);
  }

  const metaEntries = Object.entries(FEATURE_METADATA).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a[1].category as (typeof CATEGORY_ORDER)[number]) -
        CATEGORY_ORDER.indexOf(b[1].category as (typeof CATEGORY_ORDER)[number]) ||
      a[1].sortOrder - b[1].sortOrder
  );
  for (const [key, config] of metaEntries) {
    const values: Record<string, CellValue> = {};
    for (const plan of plans) {
      if (config.overrides && config.overrides[plan.name] !== undefined) {
        values[plan.name] = config.overrides[plan.name];
      } else {
        values[plan.name] = planFeatureSets.get(plan.name)?.has(key) ?? false;
      }
    }
    const list = categoryToRows.get(config.category) ?? [];
    list.push({ featureKey: key, featureLabel: config.label, category: config.category, values });
    categoryToRows.set(config.category, list);
  }

  if (unmappedKeys.length > 0) {
    const otherRows: BuiltRow[] = unmappedKeys.map((key) => {
      const values: Record<string, CellValue> = {};
      for (const plan of plans) {
        values[plan.name] = planFeatureSets.get(plan.name)?.has(key) ?? false;
      }
      return {
        featureKey: key,
        featureLabel: featureDisplayNames[key] ?? key,
        category: "Other Features",
        values,
      };
    });
    categoryToRows.set("Other Features", otherRows);
  }

  const result: { category: string; rows: BuiltRow[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    const rows = categoryToRows.get(cat);
    if (rows?.length) result.push({ category: cat, rows });
  }
  return result;
}
