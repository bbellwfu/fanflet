import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import {
  type ComparisonPlan,
  type CellValue,
  CATEGORY_STYLES,
  buildPlanFeatureSets,
  buildComparisonRows,
} from "@/lib/plan-features";

const COLORS = {
  navy: "#1B2A4A",
  emerald: "#10B981",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray400: "#94A3B8",
  gray600: "#475569",
} as const;

interface FeatureComparisonDashboardProps {
  plans: ComparisonPlan[];
  featureMatrix: Record<string, string[]>;
  featureDisplayNames: Record<string, string>;
  currentPlanName: string | null;
}

function CellContent({ value }: { value: CellValue }) {
  if (typeof value === "string") {
    return (
      <span className="text-xs font-medium text-[#1B2A4A]">{value}</span>
    );
  }
  if (value === true) {
    return <Check className="w-4 h-4 mx-auto text-emerald-500" aria-label="Included" />;
  }
  return <Minus className="w-3.5 h-3.5 mx-auto text-slate-200" aria-label="Not included" />;
}

export function FeatureComparisonDashboard({
  plans,
  featureMatrix,
  featureDisplayNames,
  currentPlanName,
}: FeatureComparisonDashboardProps) {
  const planFeatureSets = buildPlanFeatureSets(plans, featureMatrix);
  const categoryRows = buildComparisonRows(plans, planFeatureSets, featureDisplayNames);

  if (plans.length === 0) return null;

  const colCount = plans.length + 1;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1B365D]">Compare plans in detail</h2>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-[#e2e8f0]">
              <th className="text-left py-3 px-4 w-2/5">
                <span className="text-xs font-medium text-slate-400">Features</span>
              </th>
              {plans.map((plan) => {
                const isCurrent = plan.name === currentPlanName || (plan.name === "free" && !currentPlanName);
                return (
                  <th
                    key={plan.name}
                    className={`text-center py-3 px-3 ${isCurrent ? "bg-blue-50/50" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold text-[#1B2A4A]">
                        {plan.display_name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                          Your plan
                        </span>
                      )}
                    </div>
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
                      className="py-2 px-4 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        color: styles.accentColor,
                        borderLeft: `3px solid ${styles.accentColor}`,
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
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        {row.featureLabel}
                      </td>
                      {plans.map((plan) => {
                        const isCurrent = plan.name === currentPlanName || (plan.name === "free" && !currentPlanName);
                        return (
                          <td
                            key={plan.name}
                            className={`py-2.5 px-3 text-center ${isCurrent ? "bg-blue-50/30" : ""}`}
                          >
                            <CellContent value={row.values[plan.name] ?? false} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-4">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlanName || (plan.name === "free" && !currentPlanName);
          return (
            <div
              key={plan.name}
              className={`rounded-lg border overflow-hidden ${
                isCurrent ? "border-blue-300 ring-1 ring-blue-200" : "border-[#e2e8f0]"
              }`}
            >
              <div className={`px-4 py-2.5 font-semibold text-sm ${
                isCurrent ? "bg-blue-500 text-white" : "bg-slate-100 text-[#1B2A4A]"
              }`}>
                {plan.display_name}
                {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase opacity-80">Your plan</span>}
              </div>
              <div className="divide-y divide-slate-100">
                {categoryRows.map(({ rows }) =>
                  rows.map((row) => {
                    const val = row.values[plan.name];
                    if (val === false) return null;
                    return (
                      <div
                        key={row.featureLabel}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-xs text-slate-600">{row.featureLabel}</span>
                        <div className="shrink-0 ml-2">
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
  );
}
