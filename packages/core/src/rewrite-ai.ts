import { AiUsageData } from "./ai-usage";

export async function rewriteTechnicalText(
  text: string,
  apiKey: string,
  context?: string
): Promise<{ text: string; usage: AiUsageData }> {
  if (!text.trim()) return { text, usage: { model: "claude-3-haiku-20240307", prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };

  const prompt = `You are a helpful assistant for the Fanflet team. 
Fanflet is a platform where speakers (like dentists or doctors) manage their conference talks and sponsor resources.

I have some text from our internal worklogs that needs to be rewritten for an audience of speakers and sponsors. 
Please rewrite it to be shorter, simpler, and much more audience-friendly. 
Focus on the VALUE or what they can now DO, and remove technical implementation details (like database migrations, RPC calls, RLS policies, etc.).

${context ? `Here is the current list of items in this release for context:\n${context}\n\n` : ""}
Text to rewrite:
"${text}"

Revised audience-friendly text:
(Rules: Provide ONLY the raw revised text. No preambles, no narratives like "Here is the revised text:", and NO surrounding quotes. Return the plain text immediately usable in an editor.)`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      id?: string;
      model: string;
      usage?: {
        input_tokens: number;
        output_tokens: number;
      };
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = result.content?.find((block) => block.type === "text");

    if (!textBlock?.text) {
      throw new Error("No text content in AI response");
    }

    const cleaned = textBlock.text.trim();
    // Remove leading/trailing quotes if the AI included them
    const final_text = cleaned.replace(/^["']|["']$/g, "").trim();

    return {
      text: final_text,
      usage: {
        model: result.model || "claude-3-haiku-20240307",
        prompt_tokens: result.usage?.input_tokens ?? 0,
        completion_tokens: result.usage?.output_tokens ?? 0,
        total_tokens:
          (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
        provider_request_id: result.id,
      },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI rewrite timed out after 20 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
