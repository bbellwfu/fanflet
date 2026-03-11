/**
 * Branded confirmation email for sponsor inquiry form submissions.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FANFLET_URL = "https://fanflet.com";

/**
 * Renders the HTML for the "we received your inquiry" confirmation email
 * sent to the requester after they submit the sponsor inquiry form.
 */
export function renderSponsorInquiryConfirmation(recipientName: string): string {
  const heading = "We received your inquiry";
  const bodyText = `Thanks, ${escapeHtml(recipientName)}! We got your message and will be in touch within 1–2 business days to discuss how Fanflet can work for your sponsorship goals.`;
  const ctaLabel = "Learn more about Fanflet";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;">
      <div style="background:#1B365D;padding:24px 32px;">
        <div style="margin-bottom:16px;">
          <img src="https://fanflet.com/logo.png" alt="Fanflet" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:6px;" />
          <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:18px;font-weight:600;margin-left:10px;letter-spacing:-0.2px;">Fanflet</span>
        </div>
        <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">${escapeHtml(heading)}</h1>
      </div>
      <div style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 24px;">${bodyText}</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${FANFLET_URL}" style="display:inline-block;background:#1B365D;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-0.1px;">${escapeHtml(ctaLabel)}</a>
        </div>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Sent by Fanflet &bull; <a href="${FANFLET_URL}" style="color:#94a3b8;text-decoration:underline;">fanflet.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
