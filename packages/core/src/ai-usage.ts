/**
 * Centralized utility for tracking AI API usage and calculating costs.
 */

export interface AiUsageData {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  provider_request_id?: string;
}

export interface AiUsageLogEntry {
  admin_id: string;
  feature_name: string;
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  context?: Record<string, any>;
  status: "success" | "error";
  error_message?: string;
  provider_request_id?: string;
}

/**
 * Pricing rates per 1,000,000 tokens (USD)
 */
const PRICING_RATES: Record<string, { input: number; output: number }> = {
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-5-sonnet-20240620": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
};

/**
 * Calculates the estimated USD cost for an AI completion.
 */
export function calculateAiCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const rates = PRICING_RATES[model] || PRICING_RATES["claude-3-haiku-20240307"];
  const inputCost = (promptTokens / 1_000_000) * rates.input;
  const outputCost = (completionTokens / 1_000_000) * rates.output;
  return Number((inputCost + outputCost).toFixed(8));
}

/**
 * Logs AI usage to the database via Supabase.
 * This should be called from server-side code (actions/services).
 */
export async function logAiUsage(
  supabase: any, // Any Supabase client (service role usually)
  entry: AiUsageLogEntry
): Promise<{ success: boolean; error?: any }> {
  let estimated_cost_usd = entry.estimated_cost_usd;

  if (
    !estimated_cost_usd &&
    entry.model &&
    entry.prompt_tokens !== undefined &&
    entry.completion_tokens !== undefined
  ) {
    estimated_cost_usd = calculateAiCost(
      entry.model,
      entry.prompt_tokens,
      entry.completion_tokens
    );
  }

  try {
    const { error } = await supabase.from("ai_usage_logs").insert({
      admin_id: entry.admin_id,
      feature_name: entry.feature_name,
      model: entry.model,
      prompt_tokens: entry.prompt_tokens,
      completion_tokens: entry.completion_tokens,
      total_tokens: entry.total_tokens,
      estimated_cost_usd,
      context: entry.context || {},
      status: entry.status,
      error_message: entry.error_message,
      provider_request_id: entry.provider_request_id,
    });

    if (error) {
      console.error("[ai-usage] Failed to insert log:", error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("[ai-usage] Unexpected error logging usage:", err);
    return { success: false, error: err };
  }
}
