interface AnnouncementEmailParams {
  title: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

export function renderAnnouncementEmail({
  title,
  bodyHtml,
  unsubscribeUrl,
  preferencesUrl,
}: AnnouncementEmailParams): string {
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
    .header .brand { color: rgba(255,255,255,0.7); font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
    .body { padding: 32px; color: #334155; font-size: 15px; line-height: 1.6; }
    .body h2 { color: #1B365D; font-size: 17px; margin: 24px 0 8px; }
    .body h3 { color: #1B365D; font-size: 15px; margin: 20px 0 6px; }
    .body p { margin: 0 0 16px; }
    .body ul { padding-left: 20px; margin: 0 0 16px; }
    .body li { margin-bottom: 6px; }
    .body a { color: #2563eb; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0 0 4px; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">Fanflet</div>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="body">
        ${bodyHtml}
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
