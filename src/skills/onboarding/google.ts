import type { Mem0Client } from "../../shared/mem0-client.js";
import { createMem0Client } from "../../shared/mem0-client.js";
import type { GoogleOAuthTokens, UserId } from "../../shared/schemas.js";
import { emptyProfile } from "../../shared/schemas.js";
import {
  getCanonicalProductionUrl,
  getGoogleOAuthBlockReason,
  isGoogleOAuthAllowed,
  resolvePublicBaseUrl,
} from "../../shared/env.js";

/** Process-local cache — Mem0 is the durable store across serverless invocations. */
const tokenCache = new Map<UserId, GoogleOAuthTokens>();

export function getGoogleEnv(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const base = resolvePublicBaseUrl();
  if (!clientId || !clientSecret || !base || !isGoogleOAuthAllowed()) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${base}/api/connect/google/callback`,
  };
}

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export function getGoogleSetupInfo(): {
  configured: boolean;
  enabled: boolean;
  disabledReason: string | null;
  productionUrl: string | null;
  redirectUri: string | null;
  clientIdHint: string | null;
  scopes: string[];
} {
  const env = getGoogleEnv();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return {
    configured: env !== null,
    enabled: isGoogleOAuthAllowed(),
    disabledReason: getGoogleOAuthBlockReason(),
    productionUrl: getCanonicalProductionUrl(),
    redirectUri: env?.redirectUri ?? null,
    clientIdHint: clientId
      ? `${clientId.slice(0, 12)}…${clientId.slice(-20)}`
      : null,
    scopes: SCOPES.split(" "),
  };
}

export function encodeGoogleOAuthState(userId: UserId, resumeToken?: string): string {
  if (!resumeToken) return userId;
  return Buffer.from(JSON.stringify({ u: userId, r: resumeToken })).toString("base64url");
}

export function parseGoogleOAuthState(
  raw: string | null,
): { userId: UserId; resumeToken?: string } | null {
  if (!raw?.trim()) return null;
  if (raw.startsWith("tg:")) return { userId: raw as UserId };
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString()) as {
      u?: string;
      r?: string;
    };
    if (parsed.u?.startsWith("tg:")) {
      return { userId: parsed.u as UserId, resumeToken: parsed.r };
    }
  } catch {
    /* legacy plain userId */
  }
  return raw.startsWith("tg:") ? { userId: raw as UserId } : null;
}

export function googleAuthUrl(userId: UserId, resumeToken?: string): string | null {
  const env = getGoogleEnv();
  if (!env) return null;
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: encodeGoogleOAuthState(userId, resumeToken),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
  code: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
  const env = getGoogleEnv();
  if (!env) throw new Error("Google OAuth not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { error?: string; error_description?: string };
      detail = [parsed.error, parsed.error_description].filter(Boolean).join(": ");
    } catch {
      /* keep raw body */
    }
    throw new Error(detail || `Google token exchange failed (${res.status})`);
  }

  const data = JSON.parse(body) as {
    access_token: string;
    refresh_token?: string;
  };
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
  const env = getGoogleEnv();
  if (!env) throw new Error("Google OAuth not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status})`);
  }

  const data = JSON.parse(body) as {
    access_token: string;
    refresh_token?: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
  };
}

async function loadGoogleTokens(
  userId: UserId,
  mem0: Mem0Client,
): Promise<GoogleOAuthTokens | null> {
  const cached = tokenCache.get(userId);
  if (cached) return cached;

  const profile = await mem0.getProfile(userId);
  if (profile?.googleOAuth?.accessToken) {
    tokenCache.set(userId, profile.googleOAuth);
    return profile.googleOAuth;
  }
  return null;
}

/** Persist Google OAuth tokens on the traveller profile in Mem0. */
export async function saveGoogleTokens(
  userId: UserId,
  accessToken: string,
  refreshToken: string | undefined,
  mem0: Mem0Client = createMem0Client(),
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const tokens: GoogleOAuthTokens = {
    accessToken,
    refreshToken,
    updatedAt,
  };
  tokenCache.set(userId, tokens);

  const profile = (await mem0.getProfile(userId)) ?? emptyProfile(userId, updatedAt);
  profile.googleOAuth = tokens;
  profile.updatedAt = updatedAt;
  await mem0.saveProfile(profile);
}

async function accessTokenForUser(
  userId: UserId,
  mem0: Mem0Client,
): Promise<string | null> {
  const tokens = await loadGoogleTokens(userId, mem0);
  if (!tokens) return null;
  return tokens.accessToken;
}

async function fetchWithGoogleAuth(
  userId: UserId,
  mem0: Mem0Client,
  request: (accessToken: string) => Promise<Response>,
): Promise<Response> {
  const tokens = await loadGoogleTokens(userId, mem0);
  if (!tokens) throw new Error("Google not connected for this user");

  let response = await request(tokens.accessToken);
  if (response.status !== 401 || !tokens.refreshToken) return response;

  const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
  await saveGoogleTokens(userId, refreshed.accessToken, refreshed.refreshToken, mem0);
  return request(refreshed.accessToken);
}

export async function fetchGoogleSignals(
  userId: UserId,
  mem0: Mem0Client = createMem0Client(),
): Promise<{
  emails: { subject: string; snippet?: string }[];
  calendar: { title: string; start?: string; location?: string }[];
}> {
  const hasTokens = await accessTokenForUser(userId, mem0);
  if (!hasTokens) return { emails: [], calendar: [] };

  const authFetch = (accessToken: string) => ({
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const [mailRes, calRes] = await Promise.all([
    fetchWithGoogleAuth(userId, mem0, (accessToken) =>
      fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=flight+OR+hotel+OR+booking&maxResults=8",
        authFetch(accessToken),
      ),
    ),
    fetchWithGoogleAuth(userId, mem0, (accessToken) =>
      fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=" +
          encodeURIComponent(new Date().toISOString()),
        authFetch(accessToken),
      ),
    ),
  ]);

  const emails: { subject: string; snippet?: string }[] = [];
  const calendar: { title: string; start?: string; location?: string }[] = [];
  const apiErrors: string[] = [];

  if (!mailRes.ok) {
    apiErrors.push(`Gmail API ${mailRes.status}`);
  } else {
    const mail = (await mailRes.json()) as {
      messages?: { id: string }[];
    };
    const accessToken = (await loadGoogleTokens(userId, mem0))!.accessToken;
    const headers = authFetch(accessToken);
    for (const msg of mail.messages ?? []) {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Snippet`,
        headers,
      );
      if (!detail.ok) continue;
      const d = (await detail.json()) as {
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const subject =
        d.payload?.headers?.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      emails.push({ subject, snippet: d.snippet });
    }
  }

  if (!calRes.ok) {
    apiErrors.push(`Calendar API ${calRes.status}`);
  } else {
    const cal = (await calRes.json()) as {
      items?: { summary?: string; start?: { dateTime?: string }; location?: string }[];
    };
    for (const item of cal.items ?? []) {
      calendar.push({
        title: item.summary ?? "(event)",
        start: item.start?.dateTime,
        location: item.location,
      });
    }
  }

  if (apiErrors.length && emails.length === 0 && calendar.length === 0) {
    throw new Error(
      `Google connected but APIs returned no data (${apiErrors.join(", ")}). Enable Gmail API and Google Calendar API in Cloud Console.`,
    );
  }

  return { emails, calendar };
}

/** Strip OAuth secrets before returning a profile to clients. */
export function redactGoogleOAuth<T extends { googleOAuth?: GoogleOAuthTokens }>(
  profile: T,
): T {
  if (!profile.googleOAuth) return profile;
  const { googleOAuth: _removed, ...safe } = profile;
  return safe as T;
}
