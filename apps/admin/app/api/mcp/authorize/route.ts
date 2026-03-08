import { getOAuthClient } from "@fanflet/mcp";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getAdminBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3001";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const responseType = url.searchParams.get("response_type");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state");
  const scope = url.searchParams.get("scope");

  if (!clientId || !redirectUri || !codeChallenge) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 }
    );
  }

  if (responseType !== "code") {
    return Response.json(
      { error: "unsupported_response_type" },
      { status: 400 }
    );
  }

  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    return Response.json(
      { error: "invalid_request", error_description: "Only S256 code challenge method is supported" },
      { status: 400 }
    );
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    return Response.json(
      { error: "invalid_client", error_description: "Unknown client_id" },
      { status: 400 }
    );
  }

  if (!client.redirect_uris.includes(redirectUri)) {
    return Response.json(
      { error: "invalid_request", error_description: "redirect_uri not registered" },
      { status: 400 }
    );
  }

  const baseUrl = getAdminBaseUrl();
  const callbackUrl = `${baseUrl}/api/mcp/callback`;

  const statePayload = JSON.stringify({
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    scope: scope ?? "",
    original_state: state ?? "",
  });
  const encodedState = Buffer.from(statePayload).toString("base64url");

  const loginUrl = new URL(`${baseUrl}/login`);
  loginUrl.searchParams.set("mcp_callback", callbackUrl);
  loginUrl.searchParams.set("mcp_state", encodedState);

  return NextResponse.redirect(loginUrl.toString());
}
