import type { ISODate, UserId } from "../../shared/schemas.js";
import { resolvePublicBaseUrl } from "../../shared/env.js";

const tokenStore = new Map<UserId, { accessToken: string; refreshToken?: string; at: ISODate }>();

export function getGoogleEnv(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const base = resolvePublicBaseUrl();
  if (!clientId || !clientSecret || !base) return null;
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

export function googleAuthUrl(userId: UserId): string | null {
  const env = getGoogleEnv();
  if (!env) return null;
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: userId,
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

  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
  };
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export function saveGoogleTokens(
  userId: UserId,
  accessToken: string,
  refreshToken?: string,
): void {
  tokenStore.set(userId, {
    accessToken,
    refreshToken,
    at: new Date().toISOString(),
  });
}

export async function fetchGoogleSignals(userId: UserId): Promise<{
  emails: { subject: string; snippet?: string }[];
  calendar: { title: string; start?: string; location?: string }[];
}> {
  const tokens = tokenStore.get(userId);
  if (!tokens) return { emails: [], calendar: [] };

  const headers = { Authorization: `Bearer ${tokens.accessToken}` };

  const [mailRes, calRes] = await Promise.all([
    fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=flight+OR+hotel+OR+booking&maxResults=8",
      { headers },
    ),
    fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=" +
        encodeURIComponent(new Date().toISOString()),
      { headers },
    ),
  ]);

  const emails: { subject: string; snippet?: string }[] = [];
  const calendar: { title: string; start?: string; location?: string }[] = [];

  if (mailRes.ok) {
    const mail = (await mailRes.json()) as {
      messages?: { id: string }[];
    };
    for (const msg of mail.messages ?? []) {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Snippet`,
        { headers },
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

  if (calRes.ok) {
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

  return { emails, calendar };
}
