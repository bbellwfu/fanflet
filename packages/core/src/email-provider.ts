/**
 * Provider-agnostic email interface.
 *
 * Phase 1: Resend implementation (in admin app).
 * Future: Mailchimp or another ESP implements the same contract.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyPlain?: string;
}

export interface EmailSendResult {
  email: string;
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(messages: EmailMessage[]): Promise<EmailSendResult[]>;
}
