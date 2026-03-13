import { describe, it, expect } from 'vitest'
import {
  FEATURE_METADATA,
  CATEGORY_ORDER,
  LIMIT_ROWS,
  buildPlanFeatureSets,
  buildComparisonRows,
  type ComparisonPlan,
} from '../plan-features'

const PLANS: ComparisonPlan[] = [
  { name: 'free', display_name: 'Free', limits: { max_fanflets: 5 } },
  { name: 'pro', display_name: 'Pro', limits: { max_fanflets: -1 } },
  { name: 'enterprise', display_name: 'Enterprise', limits: { max_fanflets: -1 } },
]

const FEATURE_MATRIX: Record<string, string[]> = {
  free: ['personalized_branded_urls', 'profile_bio_photo', 'custom_resources_links', 'email_list_building', 'basic_engagement_stats', 'email_support', 'mcp_access'],
  pro: ['personalized_branded_urls', 'profile_bio_photo', 'custom_resources_links', 'multiple_theme_colors', 'email_list_building', 'custom_expiration', 'surveys_session_feedback', 'basic_engagement_stats', 'click_through_analytics', 'email_support', 'priority_support', 'sponsor_visibility', 'file_upload', 'mcp_access'],
  enterprise: ['personalized_branded_urls', 'profile_bio_photo', 'custom_resources_links', 'multiple_theme_colors', 'email_list_building', 'custom_expiration', 'surveys_session_feedback', 'basic_engagement_stats', 'click_through_analytics', 'advanced_reporting', 'email_support', 'priority_support', 'dedicated_account_manager', 'sso_team_management', 'api_access', 'sponsor_visibility', 'file_upload', 'sponsor_reports', 'enterprise_integrations', 'mcp_access'],
}

describe('FEATURE_METADATA', () => {
  it('has entries for all documented features', () => {
    expect(Object.keys(FEATURE_METADATA).length).toBeGreaterThan(10)
  })

  it('each entry has label, category, and sortOrder', () => {
    for (const [key, config] of Object.entries(FEATURE_METADATA)) {
      expect(config.label, `${key} missing label`).toBeTruthy()
      expect(config.category, `${key} missing category`).toBeTruthy()
      expect(typeof config.sortOrder, `${key} sortOrder not number`).toBe('number')
    }
  })

  it('all categories are in CATEGORY_ORDER', () => {
    const orderSet = new Set(CATEGORY_ORDER)
    for (const [key, config] of Object.entries(FEATURE_METADATA)) {
      expect(orderSet.has(config.category as typeof CATEGORY_ORDER[number]), `${key} has unknown category "${config.category}"`).toBe(true)
    }
  })
})

describe('LIMIT_ROWS', () => {
  it('formats -1 as Unlimited', () => {
    expect(LIMIT_ROWS[0].format(-1)).toBe('Unlimited')
  })

  it('formats positive numbers as strings', () => {
    expect(LIMIT_ROWS[0].format(5)).toBe('5')
  })
})

describe('buildPlanFeatureSets', () => {
  it('returns a Map with an entry per plan', () => {
    const result = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    expect(result.size).toBe(3)
    expect(result.has('free')).toBe(true)
    expect(result.has('pro')).toBe(true)
    expect(result.has('enterprise')).toBe(true)
  })

  it('free plan has correct feature set', () => {
    const result = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    const freeFeatures = result.get('free')!
    expect(freeFeatures.has('personalized_branded_urls')).toBe(true)
    expect(freeFeatures.has('click_through_analytics')).toBe(false)
  })

  it('handles missing plan in matrix gracefully', () => {
    const result = buildPlanFeatureSets(
      [{ name: 'unknown', display_name: 'Unknown', limits: {} }],
      FEATURE_MATRIX
    )
    expect(result.get('unknown')!.size).toBe(0)
  })
})

describe('buildComparisonRows', () => {
  it('returns rows grouped by category', () => {
    const featureSets = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    const rows = buildComparisonRows(PLANS, featureSets, {})
    expect(rows.length).toBeGreaterThan(0)

    for (const group of rows) {
      expect(group.category).toBeTruthy()
      expect(group.rows.length).toBeGreaterThan(0)
    }
  })

  it('categories appear in CATEGORY_ORDER', () => {
    const featureSets = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    const rows = buildComparisonRows(PLANS, featureSets, {})
    const categories = rows.map((r) => r.category)

    for (let i = 1; i < categories.length; i++) {
      const prevIdx = CATEGORY_ORDER.indexOf(categories[i - 1] as typeof CATEGORY_ORDER[number])
      const currIdx = CATEGORY_ORDER.indexOf(categories[i] as typeof CATEGORY_ORDER[number])
      expect(currIdx).toBeGreaterThanOrEqual(prevIdx)
    }
  })

  it('includes limit rows in Content & Branding', () => {
    const featureSets = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    const rows = buildComparisonRows(PLANS, featureSets, {})
    const contentRows = rows.find((r) => r.category === 'Content & Branding')!
    const limitRow = contentRows.rows.find((r) => r.featureLabel === 'Number of fanflets')
    expect(limitRow).toBeDefined()
    expect(limitRow!.values.free).toBe('5')
    expect(limitRow!.values.pro).toBe('Unlimited')
  })

  it('applies overrides from FEATURE_METADATA', () => {
    const featureSets = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    const rows = buildComparisonRows(PLANS, featureSets, {})
    const allRows = rows.flatMap((r) => r.rows)
    const themeRow = allRows.find((r) => r.featureKey === 'multiple_theme_colors')
    expect(themeRow).toBeDefined()
    expect(themeRow!.values.free).toBe('1')
    expect(themeRow!.values.pro).toBe('Multiple')
    expect(themeRow!.values.enterprise).toBe('Custom')
  })

  it('uses boolean for features without overrides', () => {
    const featureSets = buildPlanFeatureSets(PLANS, FEATURE_MATRIX)
    const rows = buildComparisonRows(PLANS, featureSets, {})
    const allRows = rows.flatMap((r) => r.rows)
    const analyticsRow = allRows.find((r) => r.featureKey === 'click_through_analytics')
    expect(analyticsRow).toBeDefined()
    expect(analyticsRow!.values.free).toBe(false)
    expect(analyticsRow!.values.pro).toBe(true)
  })

  it('puts unmapped features in Other Features', () => {
    const featureSets = buildPlanFeatureSets(PLANS, {
      free: ['unknown_feature'],
      pro: ['unknown_feature'],
      enterprise: ['unknown_feature'],
    })
    const rows = buildComparisonRows(PLANS, featureSets, { unknown_feature: 'Mystery Feature' })
    const otherGroup = rows.find((r) => r.category === 'Other Features')
    expect(otherGroup).toBeDefined()
    expect(otherGroup!.rows[0].featureLabel).toBe('Mystery Feature')
  })
})
