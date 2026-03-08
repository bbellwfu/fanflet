import { Resend } from "resend";
import type {
  EmailProvider,
  EmailMessage,
  EmailSendResult,
} from "@fanflet/core/email-provider";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      const batch = messages.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (msg) => {
          const { data, error } = await this.resend.emails.send({
            from: this.from,
            to: [msg.to],
            subject: msg.subject,
            html: msg.bodyHtml,
            ...(msg.bodyPlain ? { text: msg.bodyPlain } : {}),
          });

          if (error) {
            return {
              email: msg.to,
              success: false,
              error: error.message,
            } satisfies EmailSendResult;
          }

          return {
            email: msg.to,
            success: true,
            externalId: data?.id,
          } satisfies EmailSendResult;
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            email: "unknown",
            success: false,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }

      if (i + BATCH_SIZE < messages.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return results;
  }
}
