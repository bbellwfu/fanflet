import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import {
  type ComparisonPlan,
  type CellValue,
  CATEGORY_ORDER,
  CATEGORY_STYLES,
  buildPlanFeatureSets,
  buildComparisonRows,
} from "@/lib/plan-features";

export type { ComparisonPlan };

const COLORS = {
  navy: "#1B2A4A",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
  emerald: "#10B981",
  violet: "#7C3AED",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray400: "#94A3B8",
  gray600: "#475569",
} as const;

interface FeatureComparisonProps {
  plans: ComparisonPlan[];
  featureMatrix: Record<string, string[]>;
  featureDisplayNames: Record<string, string>;
}

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

export function FeatureComparison({
  plans,
  featureMatrix,
  featureDisplayNames,
}: FeatureComparisonProps) {
  const planFeatureSets = buildPlanFeatureSets(plans, featureMatrix);
  const categoryRows = buildComparisonRows(plans, planFeatureSets, featureDisplayNames);

  if (plans.length === 0) return null;

  const colCount = plans.length + 1;

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
                <th className="text-left py-4 px-6 w-1/2">
                  <span className="text-sm font-medium" style={{ color: COLORS.gray400 }}>
                    Features
                  </span>
                </th>
                {plans.map((plan) => {
                  const isPro = plan.name === "pro";
                  return (
                    <th
                      key={plan.name}
                      className="text-center py-4 px-4 w-1/4"
                      style={isPro ? { background: "rgba(59, 130, 246, 0.05)" } : undefined}
                    >
                      {isPro ? (
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: COLORS.blueLight, color: COLORS.blue }}
                          >
                            Popular
                          </span>
                          <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                            {plan.display_name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <AccentDot
                            color={plan.name === "free" ? COLORS.emerald : COLORS.gray600}
                          />
                          <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                            {plan.display_name}
                          </span>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {categoryRows.map(({ category, rows }, catIdx) => {
                const styles = CATEGORY_STYLES[category] ?? CATEGORY_STYLES["Other Features"];
                return (
                  <Fragment key={category}>
                    <tr
                      style={{
                        background: styles.accentColorLight,
                        borderTop: catIdx > 0 ? `1px solid ${COLORS.gray200}` : undefined,
                      }}
                    >
                      <td
                        colSpan={colCount}
                        className="py-3 px-6 text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: styles.accentColor,
                          borderLeft: `4px solid ${styles.accentColor}`,
                        }}
                      >
                        {category}
                      </td>
                    </tr>
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={row.featureLabel}
                        style={{
                          borderTop: `1px solid ${COLORS.gray100}`,
                          background: rowIdx % 2 === 1 ? "rgba(248, 250, 252, 0.5)" : "white",
                        }}
                      >
                        <td className="py-3.5 px-6 text-sm" style={{ color: COLORS.gray600 }}>
                          {row.featureLabel}
                        </td>
                        {plans.map((plan) => (
                          <td
                            key={plan.name}
                            className="py-3.5 px-4 text-center"
                            style={plan.name === "pro" ? { background: "rgba(59, 130, 246, 0.05)" } : undefined}
                          >
                            <CellContent value={row.values[plan.name] ?? false} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-6">
          {plans.map((plan) => {
            const isHighlighted = plan.name === "pro";
            const isFree = plan.name === "free";
            const headerStyle: React.CSSProperties = isFree
              ? {
                  background: COLORS.emerald,
                  color: "white",
                  borderBottom: `1px solid ${COLORS.emerald}`,
                }
              : {
                  background: COLORS.blue,
                  color: "white",
                  borderBottom: `1px solid ${COLORS.blue}`,
                };
            const borderColor = isFree ? COLORS.emerald : COLORS.blue;

            return (
              <div
                key={plan.name}
                className="rounded-xl overflow-hidden border"
                style={{ borderColor, background: "white" }}
              >
                <div className="px-5 py-4 font-bold text-base" style={headerStyle}>
                  {plan.display_name}
                </div>
                <div>
                  {categoryRows.map(({ rows }) =>
                    rows.map((row) => {
                      const val = row.values[plan.name];
                      if (val === false) return null;
                      return (
                        <div
                          key={row.featureLabel}
                          className="flex items-center justify-between px-5 py-3"
                          style={{ borderBottom: `1px solid ${COLORS.gray100}` }}
                        >
                          <span className="text-sm" style={{ color: COLORS.gray600 }}>
                            {row.featureLabel}
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
