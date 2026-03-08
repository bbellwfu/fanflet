import { registerOAuthClient } from "@fanflet/mcp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body.redirect_uris ||
      !Array.isArray(body.redirect_uris) ||
      body.redirect_uris.length === 0
    ) {
      return Response.json(
        { error: "invalid_client_metadata", error_description: "redirect_uris is required" },
        { status: 400 }
      );
    }

    const client = await registerOAuthClient({
      redirect_uris: body.redirect_uris,
      client_name: body.client_name,
      client_uri: body.client_uri,
      logo_uri: body.logo_uri,
      scope: body.scope,
      grant_types: body.grant_types,
      response_types: body.response_types,
      token_endpoint_auth_method: body.token_endpoint_auth_method,
    });

    return Response.json(
      {
        client_id: client.client_id,
        client_secret: client.client_secret,
        client_id_issued_at: client.client_id_issued_at,
        client_secret_expires_at: client.client_secret_expires_at ?? 0,
        redirect_uris: client.redirect_uris,
        client_name: client.client_name,
        grant_types: client.grant_types,
        response_types: client.response_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: "server_error", error_description: "Failed to register client" },
      { status: 500 }
    );
  }
}
