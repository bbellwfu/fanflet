import type { EmailProvider } from "@fanflet/core/email-provider";
import { ResendEmailProvider } from "./email-provider-resend";

let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!_provider) {
    const providerName = process.env.PLATFORM_EMAIL_PROVIDER ?? "resend";
    switch (providerName) {
      case "resend":
        _provider = new ResendEmailProvider();
        break;
      default:
        throw new Error(`Unknown email provider: ${providerName}`);
    }
  }
  return _provider;
}

export type { EmailProvider, EmailMessage, EmailSendResult } from "@fanflet/core/email-provider";
