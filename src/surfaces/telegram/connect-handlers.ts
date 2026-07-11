import type { IncomingMessage, ServerResponse } from "node:http";
import type { Mem0Client } from "../../shared/mem0-client.js";
import { CONNECTORS } from "../../shared/import-schemas.js";
import {
  applyDestinationCity,
  applyImport,
  buildLocation,
  reverseGeocode,
} from "../../skills/onboarding/import-context.js";
import { DESTINATION_CITIES } from "../../shared/destination-cities.js";
import {
  exchangeGoogleCode,
  fetchGoogleSignals,
  getGoogleEnv,
  getGoogleSetupInfo,
  googleAuthUrl,
  saveGoogleTokens,
} from "../../skills/onboarding/google.js";
import {
  issueResumeToken,
  resolveTelegramUser,
  telegramUserId,
  type TelegramWebAppUser,
} from "./init-data.js";
import { getTelegramBotToken, getWebAppUrl, isMem0Configured } from "../../shared/env.js";
import type { UserId } from "../../shared/schemas.js";

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function requireUser(
  initData: string,
  unsafeUser: TelegramWebAppUser | undefined,
  res: ServerResponse,
  resumeToken?: string,
): TelegramWebAppUser | null {
  const user = resolveTelegramUser(
    initData,
    getTelegramBotToken(),
    unsafeUser,
    resumeToken,
  );
  if (!user) {
    json(res, 401, {
      error: "Could not verify Telegram session",
      hint: "Close the app, send /start in chat, then open from the keyboard button",
    });
    return null;
  }
  return user;
}

export async function handleSessionBootstrap(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken } = JSON.parse(raw) as {
    initData?: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
  };

  const user = resolveTelegramUser(
    initData ?? "",
    getTelegramBotToken(),
    unsafeUser,
    resumeToken,
  );
  if (!user) {
    json(res, 401, {
      error: "Could not verify Telegram session",
      hint: "Send /start in the Hermes chat, then tap 🎯 Build taste profile (keyboard button)",
    });
    return;
  }

  const userId = telegramUserId(user);
  const resume = issueResumeToken(userId, getTelegramBotToken());
  json(res, 200, {
    ok: true,
    userId,
    firstName: user.first_name,
    resume,
  });
}

export async function handleConnectSources(
  _req: IncomingMessage,
  res: ServerResponse,
) {
  const google = getGoogleSetupInfo();
  json(res, 200, {
    connectors: CONNECTORS,
    googleConfigured: google.configured,
    googleRedirectUri: google.redirectUri,
    googleClientIdHint: google.clientIdHint,
    googleScopes: google.scopes,
  });
}

export async function handleConnectLocation(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken, lat, lng } = JSON.parse(raw) as {
    initData: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
    lat: number;
    lng: number;
  };

  const user = requireUser(initData, unsafeUser, res, resumeToken);
  if (!user) return;

  const geo = await reverseGeocode(lat, lng);
  const location = buildLocation(lat, lng, geo.city, geo.country);
  const userId = telegramUserId(user);

  const profile = await applyImport(
    userId,
    { source: "location", data: { location } },
    { mem0 },
  );

  json(res, 200, {
    ok: true,
    lat: location.lat,
    lng: location.lng,
    city: location.city,
    country: location.country,
    message: location.city
      ? `Precise location saved — detected near ${location.city}.`
      : "Precise location saved.",
  });
}

export async function handleConnectDestination(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken, city } = JSON.parse(raw) as {
    initData: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
    city: string;
  };

  const user = requireUser(initData, unsafeUser, res, resumeToken);
  if (!user) return;

  try {
    const profile = await applyDestinationCity(telegramUserId(user), city, { mem0 });
    json(res, 200, {
      ok: true,
      city: profile.destinationCity,
      mem0Saved: true,
      message: `Destination saved — ${profile.destinationCity}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid city";
    const status = /Mem0/i.test(message) ? 502 : 400;
    json(res, status, {
      error: /Mem0/i.test(message) ? "Could not save to Mem0" : message,
      hint: /Mem0/i.test(message)
        ? "Try again in a few seconds. If this persists, check MEM0_API_KEY on Vercel."
        : undefined,
    });
  }
}

export async function handleConnectCities(
  _req: IncomingMessage,
  res: ServerResponse,
) {
  json(res, 200, { cities: DESTINATION_CITIES });
}

/** Teammate handoff: read a traveller's Mem0 profile by Telegram user id. */
export async function handleMem0Profile(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const userId = url.searchParams.get("userId") as UserId | null;
  const secret = url.searchParams.get("secret");
  const expected = process.env.TEAMMATE_API_SECRET?.trim();

  if (expected && secret !== expected) {
    json(res, 401, { error: "unauthorized" });
    return;
  }
  if (!userId?.startsWith("tg:")) {
    json(res, 400, {
      error: "userId required",
      hint: "Use format tg:<telegram_id>, e.g. tg:123456789",
    });
    return;
  }

  try {
    const profile = await mem0.getProfile(userId);
    if (!profile) {
      json(res, 404, {
        error: "No profile found for this user",
        userId,
        mem0Configured: isMem0Configured(),
      });
      return;
    }
    json(res, 200, { ok: true, userId, profile });
  } catch (err) {
    json(res, 502, {
      error: "Mem0 read failed",
      hint: err instanceof Error ? err.message : "unknown error",
      mem0Configured: isMem0Configured(),
    });
  }
}

export async function handleConnectPaste(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken, source, text } = JSON.parse(raw) as {
    initData: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
    source: "notion" | "obsidian";
    text: string;
  };

  const user = requireUser(initData, unsafeUser, res, resumeToken);
  if (!user) return;

  const profile = await applyImport(
    telegramUserId(user),
    { source, data: { text } },
    { mem0 },
  );

  json(res, 200, { ok: true, message: `${source} notes imported.` });
}

function googleErrorReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/deleted_client/i.test(message)) {
    return "Google OAuth client was deleted. Create a new Web client in Cloud Console and update GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET on Vercel.";
  }
  if (/invalid_client/i.test(message)) {
    return "Google client ID or secret is wrong. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel match Cloud Console.";
  }
  return message.slice(0, 220);
}

export async function handleGoogleAuthUrl(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken } = JSON.parse(raw) as {
    initData: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
  };

  const user = requireUser(initData, unsafeUser, res, resumeToken);
  if (!user) return;

  const userId = telegramUserId(user);
  const authUrl = googleAuthUrl(userId);
  if (!authUrl) {
    const setup = getGoogleSetupInfo();
    json(res, 503, {
      error: "Google OAuth not configured",
      redirectUri: setup.redirectUri,
    });
    return;
  }

  json(res, 200, {
    authUrl,
    redirectUri: getGoogleEnv()?.redirectUri ?? null,
  });
}

export async function handleGoogleStart(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const initData = url.searchParams.get("initData") ?? "";
  let unsafeUser: TelegramWebAppUser | undefined;
  const unsafeRaw = url.searchParams.get("unsafeUser");
  if (unsafeRaw) {
    try {
      unsafeUser = JSON.parse(unsafeRaw) as TelegramWebAppUser;
    } catch {
      /* ignore */
    }
  }

  const user = resolveTelegramUser(initData, getTelegramBotToken(), unsafeUser);
  if (!user) {
    res.writeHead(302, { Location: `${getWebAppUrl()}/?error=session` });
    res.end();
    return;
  }

  const userId = telegramUserId(user);
  const authUrl = googleAuthUrl(userId);
  if (!authUrl) {
    const resume = issueResumeToken(userId, getTelegramBotToken());
    res.writeHead(302, {
      Location: `${getWebAppUrl()}/?google=unconfigured&resume=${encodeURIComponent(resume)}`,
    });
    res.end();
    return;
  }

  res.writeHead(302, { Location: authUrl });
  res.end();
}

export async function handleGoogleCallback(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");

  if (!code || !userId) {
    res.writeHead(400).end("Missing code or state");
    return;
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    saveGoogleTokens(userId, tokens.accessToken, tokens.refreshToken);

    const signals = await fetchGoogleSignals(userId);
    await applyImport(userId, { source: "google", data: signals }, { mem0 });

    const n = signals.emails.length + signals.calendar.length;
    const resume = issueResumeToken(userId, getTelegramBotToken());
    res.writeHead(302, {
      Location: `${getWebAppUrl()}/?google=connected&signals=${n}&resume=${encodeURIComponent(resume)}`,
    });
    res.end();
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    const resume = userId
      ? `&resume=${encodeURIComponent(issueResumeToken(userId, getTelegramBotToken()))}`
      : "";
    const reason = encodeURIComponent(googleErrorReason(err));
    res.writeHead(302, {
      Location: `${getWebAppUrl()}/?google=error&reason=${reason}${resume}`,
    });
    res.end();
  }
}

export async function handleConnectStatus(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const initData = url.searchParams.get("initData") ?? "";
  const resumeToken = url.searchParams.get("resume") ?? undefined;
  let unsafeUser: TelegramWebAppUser | undefined;
  const unsafeRaw = url.searchParams.get("unsafeUser");
  if (unsafeRaw) {
    try {
      unsafeUser = JSON.parse(decodeURIComponent(unsafeRaw)) as TelegramWebAppUser;
    } catch {
      /* ignore */
    }
  }

  const user = requireUser(initData, unsafeUser, res, resumeToken);
  if (!user) return;

  const profile = await mem0.getProfile(telegramUserId(user));
  json(res, 200, {
    connectedSources: profile?.connectedSources ?? [],
    location: profile?.location ?? null,
    destinationCity: profile?.destinationCity ?? null,
    googleConfigured: getGoogleEnv() !== null,
    googleRedirectUri: getGoogleSetupInfo().redirectUri,
  });
}
