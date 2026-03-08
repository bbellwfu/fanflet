"use server";

import { z } from "zod";
import { Resend } from "resend";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, "Message is required").max(5000),
});

export type ContactFormState = {
  success: boolean;
  error?: string;
};

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid form data";
    return { success: false, error: firstError };
  }

  const { name, email, subject, message } = parsed.data;
  const subjectLine = subject
    ? `[Fanflet Contact] ${subject} — from ${name}`
    : `[Fanflet Contact] Message from ${name}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey?.trim()) {
    console.error("RESEND_API_KEY is not configured — contact form email not sent");
    return { success: true };
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM ?? "Fanflet <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromAddress,
      to: ["support@fanflet.com"],
      replyTo: email,
      subject: subjectLine,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        subject ? `Subject: ${subject}` : null,
        "",
        "Message:",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #1B2A4A;">New Contact Form Submission</h2>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #475569; vertical-align: top;">Name</td>
              <td style="padding: 8px 12px; color: #1e293b;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #475569; vertical-align: top;">Email</td>
              <td style="padding: 8px 12px; color: #1e293b;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
            </tr>
            ${subject ? `<tr><td style="padding: 8px 12px; font-weight: 600; color: #475569; vertical-align: top;">Subject</td><td style="padding: 8px 12px; color: #1e293b;">${escapeHtml(subject)}</td></tr>` : ""}
          </table>
          <div style="padding: 16px; background: #f8fafc; border-radius: 8px; color: #1e293b; white-space: pre-wrap;">${escapeHtml(message)}</div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send contact form email:", err);
    return { success: false, error: "Something went wrong. Please try again or email us directly." };
  }

  return { success: true };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
