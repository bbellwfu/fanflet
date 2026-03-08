import { NextResponse } from "next/server";
import { exchangeCode, refreshAccessToken } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

function oauthError(status: number, error: string, description?: string) {
  return NextResponse.json(
    { error, error_description: description ?? error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return oauthError(400, "invalid_request", "Content-Type must be application/x-www-form-urlencoded");
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const grantType = params.get("grant_type");

  if (grantType === "authorization_code") {
    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");
    const clientId = params.get("client_id");
    const codeVerifier = params.get("code_verifier");

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return oauthError(400, "invalid_request", "code, redirect_uri, client_id, and code_verifier required");
    }

    try {
      const result = await exchangeCode(code, clientId, codeVerifier, redirectUri);
      return NextResponse.json(
        {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: result.expiresIn,
          token_type: "Bearer",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid_grant";
      return oauthError(400, "invalid_grant", message);
    }
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.get("refresh_token");
    const clientId = params.get("client_id");

    if (!refreshToken || !clientId) {
      return oauthError(400, "invalid_request", "refresh_token and client_id required");
    }

    try {
      const result = await refreshAccessToken(refreshToken, clientId);
      return NextResponse.json(
        {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: result.expiresIn,
          token_type: "Bearer",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid_grant";
      return oauthError(400, "invalid_grant", message);
    }
  }

  return oauthError(400, "unsupported_grant_type", "grant_type must be authorization_code or refresh_token");
}
