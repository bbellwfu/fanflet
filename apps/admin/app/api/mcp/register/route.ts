import { NextResponse } from "next/server";
import {
  registerOAuthClient,
  hasAllowedRedirectUri,
} from "@fanflet/mcp";

export const dynamic = "force-dynamic";

/** Dynamic Client Registration (RFC 7591). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const redirectUris = body.redirect_uris;
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "redirect_uris required and must be non-empty" },
        { status: 400 }
      );
    }
    if (!hasAllowedRedirectUri(redirectUris)) {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: "At least one redirect_uri must be allowed" },
        { status: 400 }
      );
    }

    const client = await registerOAuthClient({
      redirect_uris: redirectUris,
      client_name: body.client_name ?? undefined,
      client_uri: body.client_uri ?? undefined,
      logo_uri: body.logo_uri ?? undefined,
      scope: body.scope ?? undefined,
      grant_types: body.grant_types ?? ["authorization_code", "refresh_token"],
      response_types: body.response_types ?? ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method ?? "none",
    });

    return NextResponse.json({
      client_id: client.client_id,
      client_secret: client.client_secret ?? undefined,
      client_id_issued_at: client.client_id_issued_at ?? undefined,
      client_secret_expires_at: client.client_secret_expires_at ?? undefined,
      redirect_uris: client.redirect_uris,
      client_name: client.client_name ?? undefined,
      client_uri: client.client_uri ?? undefined,
      logo_uri: client.logo_uri ?? undefined,
      scope: client.scope ?? undefined,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "server_error", error_description: "Registration failed" },
      { status: 500 }
    );
  }
}
