import { Resend } from "resend";
import type {
  EmailProvider,
  EmailMessage,
  EmailSendResult,
} from "@fanflet/core/email-provider";

/** Resend batch API allows up to 100 emails per request. */
const BATCH_SIZE = 100;
/** Stay under 2 req/s: wait 1s between batch requests. */
const DELAY_BETWEEN_BATCHES_MS = 1000;
/** Max retries on 429 rate limit, with exponential backoff (1s, 2s, 4s). */
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private resend: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    this.resend = new Resend(apiKey);
    this.from = process.env.RESEND_FROM ?? "Fanflet <onboarding@resend.dev>";
  }

  async send(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      if (i > 0) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }

      const batch = messages.slice(i, i + BATCH_SIZE);
      const payloads = batch.map((msg) => ({
        from: this.from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.bodyHtml,
        ...(msg.bodyPlain ? { text: msg.bodyPlain } : {}),
        ...(msg.replyTo ? { replyTo: [msg.replyTo] } : {}),
      }));

      let lastError: { message: string } | null = null;
      let data: unknown = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const response = await this.resend.batch.send(payloads);
        lastError = response.error ?? null;
        data = response.data ?? null;

        if (!response.error) break;
        if (!isRateLimitError(response.error) || attempt === MAX_RETRIES) break;
        const backoffMs = Math.pow(2, attempt) * 1000;
        await sleep(backoffMs);
      }

      const error = lastError;

      if (error) {
        for (const msg of batch) {
          results.push({
            email: msg.to,
            success: false,
            error: error.message,
          });
        }
        continue;
      }

      // Resend returns { data: [ { id: "..." }, ... ] }; some SDKs may nest as data.data
      const raw =
        Array.isArray(data) ? data : (data && typeof data === "object" && "data" in data)
          ? (data as { data: unknown }).data
          : null;
      const ids = Array.isArray(raw) ? raw : [];
      for (let j = 0; j < batch.length; j++) {
        const msg = batch[j];
        const item = ids[j];
        const id =
          typeof item === "object" && item !== null && "id" in item
            ? String((item as { id: string }).id)
            : undefined;
        results.push({
          email: msg.to,
          success: !!id,
          externalId: id ?? undefined,
          error: id ? undefined : "No id returned for batch item",
        });
      }
    }

    return results;
  }
}
