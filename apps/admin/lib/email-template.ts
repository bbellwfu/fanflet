interface AnnouncementEmailParams {
  title: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
  loginUrl?: string;
  inviteUrl?: string;
}

export function renderAnnouncementEmail({
  title,
  bodyHtml,
  unsubscribeUrl,
  preferencesUrl,
  loginUrl,
  inviteUrl,
}: AnnouncementEmailParams): string {
  const ctaSection =
    loginUrl || inviteUrl
      ? `
        <div style="margin: 32px 0 0; padding: 28px 0 0; border-top: 1px solid #e2e8f0; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              ${loginUrl ? `<td style="padding: 0 6px;">
                <a href="${escapeHtml(loginUrl)}" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: -0.1px;">Go to Your Dashboard</a>
              </td>` : ""}
              ${inviteUrl ? `<td style="padding: 0 6px;">
                <a href="${escapeHtml(inviteUrl)}" style="display: inline-block; background: #ffffff; color: #1B365D; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: -0.1px; border: 1.5px solid #1B365D;">Invite a Colleague</a>
              </td>` : ""}
            </tr>
          </table>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #1B365D; padding: 24px 32px; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 600; margin: 0; }
    .header .brand-row { margin-bottom: 16px; }
    .header .brand-row img { display: inline-block; vertical-align: middle; border-radius: 6px; }
    .header .brand-row span { display: inline-block; vertical-align: middle; color: #ffffff; font-size: 18px; font-weight: 600; margin-left: 10px; letter-spacing: -0.2px; }
    .body { padding: 32px; color: #334155; font-size: 15px; line-height: 1.6; }
    .body h2 { color: #1B365D; font-size: 17px; margin: 24px 0 8px; }
    .body h3 { color: #1B365D; font-size: 15px; margin: 20px 0 6px; }
    .body p { margin: 0 0 16px; }
    .body ul { padding-left: 20px; margin: 0 0 16px; }
    .body li { margin-bottom: 6px; }
    .body a { color: #2563eb; }
    .feedback { margin: 32px 0 0; padding: 24px 0 0; border-top: 1px solid #e2e8f0; }
    .feedback p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0 0 4px; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand-row">
          <img src="https://fanflet.com/logo.png" alt="Fanflet" width="32" height="32" />
          <span>Fanflet</span>
        </div>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="body">
        ${bodyHtml}
        ${ctaSection}
        <div class="feedback">
          <p>Have ideas or suggestions? Just reply to this email &mdash; we read every response.</p>
        </div>
      </div>
      <div class="footer">
        <p>You're receiving this because you opted in to platform announcements.</p>
        <p><a href="${escapeHtml(preferencesUrl)}">Manage preferences</a> &middot; <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
