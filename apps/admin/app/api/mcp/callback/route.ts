import { createAuthorizationCode } from "@fanflet/mcp";
import { createClient } from "@fanflet/db/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stateParam = url.searchParams.get("state");

  if (!stateParam) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing state parameter" },
      { status: 400 }
    );
  }

  let statePayload: {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    scope: string;
    original_state: string;
  };

  try {
    const decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
    statePayload = JSON.parse(decoded);
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Invalid state parameter" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "access_denied", error_description: "User is not authenticated. Please log in first." },
      { status: 401 }
    );
  }

  try {
    const code = await createAuthorizationCode({
      clientId: statePayload.client_id,
      authUserId: user.id,
      redirectUri: statePayload.redirect_uri,
      codeChallenge: statePayload.code_challenge,
      scope: statePayload.scope || undefined,
      state: statePayload.original_state || undefined,
    });

    const redirectUrl = new URL(statePayload.redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (statePayload.original_state) {
      redirectUrl.searchParams.set("state", statePayload.original_state);
    }

    return Response.redirect(redirectUrl.toString());
  } catch {
    const errorRedirect = new URL(statePayload.redirect_uri);
    errorRedirect.searchParams.set("error", "server_error");
    errorRedirect.searchParams.set("error_description", "Failed to generate authorization code");
    if (statePayload.original_state) {
      errorRedirect.searchParams.set("state", statePayload.original_state);
    }
    return Response.redirect(errorRedirect.toString());
  }
}
