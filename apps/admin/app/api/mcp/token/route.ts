import { exchangeCode, refreshAccessToken } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, string>;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await req.json();
  }

  const grantType = body.grant_type;

  if (grantType === "authorization_code") {
    const code = body.code;
    const clientId = body.client_id;
    const codeVerifier = body.code_verifier;
    const redirectUri = body.redirect_uri;

    if (!code || !clientId || !codeVerifier || !redirectUri) {
      return Response.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      );
    }

    try {
      const result = await exchangeCode(code, clientId, codeVerifier, redirectUri);
      return Response.json({
        access_token: result.accessToken,
        token_type: "Bearer",
        expires_in: result.expiresIn,
        refresh_token: result.refreshToken,
        scope: "admin",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "server_error";
      return Response.json(
        { error: message, error_description: "Token exchange failed" },
        { status: 400 }
      );
    }
  }

  if (grantType === "refresh_token") {
    const refreshToken = body.refresh_token;
    const clientId = body.client_id;

    if (!refreshToken || !clientId) {
      return Response.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      );
    }

    try {
      const result = await refreshAccessToken(refreshToken, clientId);
      return Response.json({
        access_token: result.accessToken,
        token_type: "Bearer",
        expires_in: result.expiresIn,
        refresh_token: result.refreshToken,
        scope: "admin",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "server_error";
      return Response.json(
        { error: message, error_description: "Token refresh failed" },
        { status: 400 }
      );
    }
  }

  return Response.json(
    { error: "unsupported_grant_type" },
    { status: 400 }
  );
}
