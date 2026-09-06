export const BLOGGER_SCOPE = "https://www.googleapis.com/auth/blogger";
export const USERINFO_EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email";

export function getOAuthConfig(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  const resolvedRedirectUri = redirectUri || configuredRedirectUri || "http://localhost:3000/api/auth/callback/google";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local");
  }

  return { clientId, clientSecret, redirectUri: resolvedRedirectUri };
}

export function buildAuthUrl(state?: string, redirectUri?: string) {
  const { clientId, redirectUri: resolvedRedirectUri } = getOAuthConfig(redirectUri);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: resolvedRedirectUri,
    response_type: "code",
    scope: `${BLOGGER_SCOPE} ${USERINFO_EMAIL_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri?: string) {
  const { clientId, clientSecret, redirectUri: resolvedRedirectUri } = getOAuthConfig(redirectUri);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: resolvedRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data as { access_token: string; refresh_token?: string; expires_in: number; scope: string; token_type: string; id_token?: string };
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(data)}`);
  return data as { access_token: string; expires_in: number };
}
