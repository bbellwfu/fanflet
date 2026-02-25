import { Fragment } from "react";
import { Check, Minus } from "lucide-react";

// PRD reference colors
const COLORS = {
  navy: "#1B2A4A",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
  emerald: "#10B981",
  violet: "#7C3AED",
  amber: "#F59E0B",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray400: "#94A3B8",
  gray600: "#475569",
} as const;

type CellValue = string | boolean;

interface FeatureRow {
  feature: string;
  free: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

interface FeatureCategory {
  name: string;
  accentColor: string;
  accentColorLight: string;
  rows: FeatureRow[];
}

const categories: FeatureCategory[] = [
  {
    name: "Content & Branding",
    accentColor: COLORS.emerald,
    accentColorLight: "rgba(16, 185, 129, 0.06)",
    rows: [
      { feature: "Number of fanflets", free: "5", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Personalized branded URLs", free: true, pro: true, enterprise: true },
      { feature: "Profile and bio with photo", free: true, pro: true, enterprise: true },
      { feature: "Custom resources and links", free: true, pro: true, enterprise: true },
      { feature: "Theme colors", free: "1", pro: "Multiple", enterprise: "Custom" },
    ],
  },
  {
    name: "Engagement",
    accentColor: COLORS.blue,
    accentColorLight: "rgba(59, 130, 246, 0.06)",
    rows: [
      { feature: "Surveys and session feedback", free: false, pro: true, enterprise: true },
      { feature: "Opt-in email list building", free: false, pro: true, enterprise: true },
      { feature: "Fanflet expiration", free: "14 days", pro: "30, 60, 90 days", enterprise: "Custom" },
    ],
  },
  {
    name: "Analytics",
    accentColor: COLORS.amber,
    accentColorLight: "rgba(245, 158, 11, 0.06)",
    rows: [
      { feature: "Basic engagement stats", free: true, pro: true, enterprise: true },
      { feature: "Click-through analytics", free: false, pro: true, enterprise: true },
      { feature: "Advanced reporting", free: false, pro: false, enterprise: true },
    ],
  },
  {
    name: "Support & Admin",
    accentColor: COLORS.violet,
    accentColorLight: "rgba(124, 58, 237, 0.06)",
    rows: [
      { feature: "Email support", free: true, pro: true, enterprise: true },
      { feature: "Priority support", free: false, pro: true, enterprise: true },
      { feature: "Dedicated account manager", free: false, pro: false, enterprise: true },
      { feature: "SSO and team management", free: false, pro: false, enterprise: true },
      { feature: "API access", free: false, pro: false, enterprise: true },
    ],
  },
];

function CellContent({ value }: { value: CellValue }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm font-medium" style={{ color: COLORS.navy }}>
        {value}
      </span>
    );
  }
  if (value === true) {
    return (
      <Check
        className="w-5 h-5 mx-auto"
        style={{ color: COLORS.emerald }}
        aria-label="Included"
      />
    );
  }
  return (
    <Minus
      className="w-4 h-4 mx-auto"
      style={{ color: COLORS.gray200 }}
      aria-label="Not included"
    />
  );
}

function AccentDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5"
      style={{ background: color }}
    />
  );
}

export function FeatureComparison() {
  return (
    <section
      className="w-full py-20 sm:py-24 px-4 sm:px-6"
      style={{ background: COLORS.gray50 }}
    >
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-3xl sm:text-4xl font-bold text-center mb-14"
          style={{ color: COLORS.navy }}
        >
          Compare plans in detail
        </h2>

        {/* Desktop Table */}
        <div
          className="hidden md:block overflow-hidden rounded-xl border"
          style={{ borderColor: COLORS.gray200, background: "white" }}
        >
          <table className="w-full" role="table">
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.gray200}` }}>
                <th className="text-left py-4 px-6 w-2/5">
                  <span className="text-sm font-medium" style={{ color: COLORS.gray400 }}>
                    Features
                  </span>
                </th>
                <th className="text-center py-4 px-4 w-1/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <AccentDot color={COLORS.emerald} />
                    <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                      Free
                    </span>
                  </div>
                </th>
                <th
                  className="text-center py-4 px-4 w-1/5"
                  style={{ background: "rgba(59, 130, 246, 0.05)" }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: COLORS.blueLight, color: COLORS.blue }}
                    >
                      Popular
                    </span>
                    <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                      Pro
                    </span>
                  </div>
                </th>
                <th className="text-center py-4 px-4 w-1/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <AccentDot color={COLORS.violet} />
                    <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                      Enterprise
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, catIdx) => (
                <Fragment key={category.name}>
                  <tr
                    style={{
                      background: category.accentColorLight,
                      borderTop: catIdx > 0 ? `1px solid ${COLORS.gray200}` : undefined,
                    }}
                  >
                    <td
                      colSpan={4}
                      className="py-3 px-6 text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: category.accentColor,
                        borderLeft: `4px solid ${category.accentColor}`,
                      }}
                    >
                      {category.name}
                    </td>
                  </tr>
                  {category.rows.map((row, rowIdx) => (
                    <tr
                      key={row.feature}
                      style={{
                        borderTop: `1px solid ${COLORS.gray100}`,
                        background: rowIdx % 2 === 1 ? "rgba(248, 250, 252, 0.5)" : "white",
                      }}
                    >
                      <td className="py-3.5 px-6 text-sm" style={{ color: COLORS.gray600 }}>
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <CellContent value={row.free} />
                      </td>
                      <td
                        className="py-3.5 px-4 text-center"
                        style={{ background: "rgba(59, 130, 246, 0.05)" }}
                      >
                        <CellContent value={row.pro} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <CellContent value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-6">
          {(["Free", "Pro", "Enterprise"] as const).map((tier) => {
            const tierKey = tier.toLowerCase() as "free" | "pro" | "enterprise";
            const isHighlighted = tier === "Pro";
            const isFree = tier === "Free";
            const isEnterprise = tier === "Enterprise";
            const headerStyle: React.CSSProperties = isFree
              ? { background: COLORS.emerald, color: "white", borderBottom: `1px solid ${COLORS.emerald}` }
              : isHighlighted
                ? { background: COLORS.blue, color: "white", borderBottom: `1px solid ${COLORS.blue}` }
                : {
                    background: `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.navy})`,
                    color: "white",
                    borderBottom: `1px solid ${COLORS.violet}`,
                  };
            const borderColor = isFree ? COLORS.emerald : isHighlighted ? COLORS.blue : COLORS.violet;

            return (
              <div
                key={tier}
                className="rounded-xl overflow-hidden border"
                style={{ borderColor, background: "white" }}
              >
                <div className="px-5 py-4 font-bold text-base" style={headerStyle}>
                  {tier}
                </div>
                <div>
                  {categories.map((category) =>
                    category.rows.map((row) => {
                      const val = row[tierKey];
                      if (val === false) return null;
                      return (
                        <div
                          key={row.feature}
                          className="flex items-center justify-between px-5 py-3"
                          style={{ borderBottom: `1px solid ${COLORS.gray100}` }}
                        >
                          <span className="text-sm" style={{ color: COLORS.gray600 }}>
                            {row.feature}
                          </span>
                          <div className="flex-shrink-0 ml-3">
                            <CellContent value={val} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
