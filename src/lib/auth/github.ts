/**
 * Minimal GitHub OAuth helpers. Falls back gracefully when env vars are
 * unset so the PAT flow keeps working in local/dev and the app never
 * crashes.
 */

export const GITHUB_OAUTH_SCOPES = ["repo", "read:user"].join(" ");
export const STATE_COOKIE = "causalist_oauth_state";
export const TOKEN_COOKIE = "causalist_github_token";

export function oauthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );
}

export function clientId(): string {
  return process.env.GITHUB_CLIENT_ID ?? "";
}

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.trim().replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:4141";
}

export function callbackUrl(): string {
  return `${appBaseUrl()}/api/auth/github/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: callbackUrl(),
    scope: GITHUB_OAUTH_SCOPES,
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<GithubTokenResponse> {
  const clientIdV = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientIdV || !clientSecret) {
    throw new Error("GitHub OAuth is not configured server-side.");
  }
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientIdV,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl(),
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }
  const json = (await res.json()) as GithubTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (json.error) {
    throw new Error(json.error_description ?? json.error);
  }
  return json;
}

export async function fetchGithubUser(
  token: string,
): Promise<{ id: number; login: string; avatar_url: string } | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "causalist-web",
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      id: number;
      login: string;
      avatar_url: string;
    };
    return { id: json.id, login: json.login, avatar_url: json.avatar_url };
  } catch {
    return null;
  }
}
