import { createServiceClient } from "@fanflet/db/service";

/**
 * Resolves the base URL for the current app. Each Next.js app should
 * set the appropriate env var:
 *
 * - apps/web:   NEXT_PUBLIC_SITE_URL  (fanflet.com / localhost:3000)
 * - apps/admin: NEXT_PUBLIC_ADMIN_URL (admin.fanflet.com / localhost:3001)
 *
 * Route handlers should pass their app's base URL explicitly to avoid ambiguity.
 */
export function getMcpBaseUrl(): string {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const url = adminUrl ?? siteUrl;
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function getMcpEndpoint(baseUrl?: string): string {
  return `${baseUrl ?? getMcpBaseUrl()}/api/mcp`;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes.buffer);
}

export async function hashToken(token: string): Promise<string> {
  return sha256(token);
}

export async function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const computed = base64UrlEncode(hashBuffer);
  return computed === codeChallenge;
}

/**
 * OAuth 2.1 Authorization Server Metadata.
 * Pass the app's base URL (e.g., from NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_ADMIN_URL).
 */
export function getOAuthMetadata(baseUrl?: string) {
  const base = baseUrl ?? getMcpBaseUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/authorize`,
    token_endpoint: `${base}/api/mcp/token`,
    registration_endpoint: `${base}/api/mcp/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["admin", "speaker", "sponsor", "audience"],
  };
}

/**
 * OAuth 2.0 Protected Resource Metadata.
 * Pass the app's base URL.
 */
export function getProtectedResourceMetadata(baseUrl?: string) {
  const base = baseUrl ?? getMcpBaseUrl();
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: ["admin", "speaker", "sponsor", "audience"],
    bearer_methods_supported: ["header"],
    resource_name: "Fanflet MCP Server",
    resource_documentation: `${base}/docs`,
  };
}

/** Claude's official MCP OAuth callback URL. */
export const MCP_REDIRECT_URI_CLAUDE = "https://claude.ai/api/mcp/auth_callback";

/**
 * Allowed redirect_uri values for OAuth authorize/token.
 * Only these URIs may be used when issuing authorization codes.
 */
export function isRedirectUriAllowed(redirectUri: string): boolean {
  const trimmed = redirectUri.trim();
  if (trimmed === MCP_REDIRECT_URI_CLAUDE) return true;
  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" && u.hostname === "localhost") return true;
  } catch {
    // invalid URL
  }
  return false;
}

/**
 * Returns true if at least one of the given URIs is allowed.
 * Used by Dynamic Client Registration to validate redirect_uris.
 */
export function hasAllowedRedirectUri(redirectUris: string[]): boolean {
  return redirectUris.some((uri) => isRedirectUriAllowed(uri));
}

export interface OAuthClient {
  client_id: string;
  client_secret: string | null;
  client_secret_expires_at: number | null;
  client_id_issued_at: number | null;
  redirect_uris: string[];
  client_name: string | null;
  client_uri: string | null;
  logo_uri: string | null;
  scope: string | null;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
}

export async function getOAuthClient(
  clientId: string
): Promise<OAuthClient | null> {
  const sc = createServiceClient();
  const { data } = await sc
    .from("mcp_oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  return data as OAuthClient | null;
}

export async function registerOAuthClient(metadata: {
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}): Promise<OAuthClient> {
  const sc = createServiceClient();
  const clientSecret = generateToken();

  const { data, error } = await sc
    .from("mcp_oauth_clients")
    .insert({
      client_secret: await hashToken(clientSecret),
      redirect_uris: metadata.redirect_uris,
      client_name: metadata.client_name ?? null,
      client_uri: metadata.client_uri ?? null,
      logo_uri: metadata.logo_uri ?? null,
      scope: metadata.scope ?? null,
      grant_types: metadata.grant_types ?? ["authorization_code", "refresh_token"],
      response_types: metadata.response_types ?? ["code"],
      token_endpoint_auth_method: metadata.token_endpoint_auth_method ?? "none",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to register OAuth client");
  }

  return {
    ...data,
    client_secret: clientSecret,
  } as OAuthClient;
}

export async function createAuthorizationCode(params: {
  clientId: string;
  authUserId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  state?: string;
}): Promise<string> {
  const sc = createServiceClient();
  const { data, error } = await sc
    .from("mcp_oauth_codes")
    .insert({
      client_id: params.clientId,
      auth_user_id: params.authUserId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      scope: params.scope ?? null,
      state: params.state ?? null,
    })
    .select("code")
    .single();

  if (error || !data) throw new Error("Failed to create authorization code");
  return data.code;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiresIn: number;
}> {
  const sc = createServiceClient();
  const { data: codeRow, error } = await sc
    .from("mcp_oauth_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error || !codeRow) throw new Error("invalid_grant");
  if (codeRow.used) throw new Error("invalid_grant");
  if (new Date(codeRow.expires_at) < new Date()) throw new Error("invalid_grant");
  if (codeRow.client_id !== clientId) throw new Error("invalid_grant");
  if (codeRow.redirect_uri !== redirectUri) throw new Error("invalid_grant");

  const pkceValid = await verifyPkceChallenge(codeVerifier, codeRow.code_challenge);
  if (!pkceValid) throw new Error("invalid_grant");

  await sc.from("mcp_oauth_codes").update({ used: true }).eq("code", code);

  const accessToken = generateToken();
  const refreshToken = generateToken();
  const expiresIn = 3600;

  const { error: tokenError } = await sc.from("mcp_oauth_tokens").insert({
    access_token_hash: await hashToken(accessToken),
    refresh_token_hash: await hashToken(refreshToken),
    client_id: clientId,
    auth_user_id: codeRow.auth_user_id,
    scope: codeRow.scope,
    access_token_expires_at: new Date(
      Date.now() + expiresIn * 1000
    ).toISOString(),
    refresh_token_expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  if (tokenError) throw new Error("server_error");

  return {
    accessToken,
    refreshToken,
    userId: codeRow.auth_user_id,
    expiresIn,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const sc = createServiceClient();
  const refreshHash = await hashToken(refreshToken);

  const { data: tokenRow, error } = await sc
    .from("mcp_oauth_tokens")
    .select("*")
    .eq("refresh_token_hash", refreshHash)
    .maybeSingle();

  if (error || !tokenRow) throw new Error("invalid_grant");
  if (tokenRow.revoked_at) throw new Error("invalid_grant");
  if (tokenRow.client_id !== clientId) throw new Error("invalid_grant");
  if (
    tokenRow.refresh_token_expires_at &&
    new Date(tokenRow.refresh_token_expires_at) < new Date()
  ) {
    throw new Error("invalid_grant");
  }

  await sc
    .from("mcp_oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  const newAccessToken = generateToken();
  const newRefreshToken = generateToken();
  const expiresIn = 3600;

  const { error: insertError } = await sc.from("mcp_oauth_tokens").insert({
    access_token_hash: await hashToken(newAccessToken),
    refresh_token_hash: await hashToken(newRefreshToken),
    client_id: clientId,
    auth_user_id: tokenRow.auth_user_id,
    scope: tokenRow.scope,
    access_token_expires_at: new Date(
      Date.now() + expiresIn * 1000
    ).toISOString(),
    refresh_token_expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  if (insertError) throw new Error("server_error");

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn };
}

export async function verifyAccessToken(
  token: string
): Promise<{ userId: string; clientId: string; scope: string | null } | null> {
  const sc = createServiceClient();
  const tokenHash = await hashToken(token);

  const { data } = await sc
    .from("mcp_oauth_tokens")
    .select("auth_user_id, client_id, scope, access_token_expires_at, revoked_at")
    .eq("access_token_hash", tokenHash)
    .maybeSingle();

  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.access_token_expires_at) < new Date()) return null;

  return {
    userId: data.auth_user_id,
    clientId: data.client_id,
    scope: data.scope,
  };
}
