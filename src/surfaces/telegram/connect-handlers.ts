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
  parseGoogleOAuthState,
  saveGoogleTokens,
} from "../../skills/onboarding/google.js";
import {
  issueResumeToken,
  resolveTelegramUser,
  telegramUserId,
  verifyResumeToken,
  type TelegramWebAppUser,
} from "./init-data.js";
import { getTelegramBotToken, getWebAppUrl, isMem0Configured, isTelegramConfigured } from "../../shared/env.js";
import type { UserId } from "../../shared/schemas.js";
import { runOnboardingDemo, tgApi } from "./telegram-bot.js";

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

/** Save trip context to Mem0 and kick off the Telegram demo itinerary. */
export async function handleOnboardingComplete(
  req: IncomingMessage,
  res: ServerResponse,
  mem0: Mem0Client,
) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken, tripContext } = JSON.parse(raw) as {
    initData: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
    tripContext?: {
      city?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
      travellers?: number;
    } | null;
  };

  const user = requireUser(initData, unsafeUser, res, resumeToken);
  if (!user) return;

  const userId = telegramUserId(user);
  try {
    if (
      tripContext?.city &&
      tripContext.startDate &&
      tripContext.endDate
    ) {
      await mem0.remember(
        userId,
        `trip-context:${JSON.stringify({
          city: tripContext.city,
          location: tripContext.location ?? tripContext.city,
          startDate: tripContext.startDate,
          endDate: tripContext.endDate,
          travellers: tripContext.travellers ?? 1,
        })}`,
      );
    }

    const chatId = user.id;
    await runOnboardingDemo(chatId, userId);
    json(res, 200, { ok: true, demoStarted: true, mem0Configured: isMem0Configured() });
  } catch (err) {
    json(res, 502, {
      error: "Could not start onboarding demo",
      hint: err instanceof Error ? err.message : "demo failed",
    });
  }
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
  const authUrl = googleAuthUrl(userId, resumeToken);
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
  const oauthState = parseGoogleOAuthState(url.searchParams.get("state"));

  if (!code || !oauthState?.userId) {
    res.writeHead(400).end("Missing code or state");
    return;
  }

  const userId = oauthState.userId;
  const botToken = getTelegramBotToken();
  const resumeFromState =
    oauthState.resumeToken && verifyResumeToken(oauthState.resumeToken, botToken)
      ? oauthState.resumeToken
      : undefined;

  try {
    const tokens = await exchangeGoogleCode(code);
    saveGoogleTokens(userId, tokens.accessToken, tokens.refreshToken);

    const signals = await fetchGoogleSignals(userId);
    await applyImport(userId, { source: "google", data: signals }, { mem0 });

    const n = signals.emails.length + signals.calendar.length;
    const resume = resumeFromState ?? issueResumeToken(userId, botToken);
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

/** Read-only check: bot username, webhook, and mini app menu URL vs expected. */
export async function handleTelegramDiagnostics(
  _req: IncomingMessage,
  res: ServerResponse,
) {
  const expectedWebAppUrl = getWebAppUrl();
  if (!isTelegramConfigured()) {
    json(res, 200, {
      ok: false,
      telegramConfigured: false,
      expectedWebAppUrl,
      hint: "Set TELEGRAM_BOT_TOKEN on Vercel to the @travel112bot bot token, then call /api/setup?secret=SETUP_SECRET",
    });
    return;
  }

  try {
    const me = (await tgApi("getMe")) as {
      result?: { username?: string; first_name?: string };
    };
    const menu = (await tgApi("getChatMenuButton")) as {
      result?: { type?: string; web_app?: { url?: string }; text?: string };
    };
    const webhook = (await tgApi("getWebhookInfo")) as {
      result?: { url?: string; pending_update_count?: number };
    };

    const menuUrl = menu.result?.web_app?.url ?? null;
    const webhookUrl = webhook.result?.url ?? null;
    const norm = (u: string | null) => u?.replace(/\/$/, "") ?? null;
    const menuUrlOk = norm(menuUrl) === norm(expectedWebAppUrl);
    const webhookOk = webhookUrl === `${expectedWebAppUrl}/api/telegram/webhook`;

    json(res, 200, {
      ok: menuUrlOk && webhookOk,
      telegramConfigured: true,
      bot: me.result?.username ? `@${me.result.username}` : null,
      botName: me.result?.first_name ?? null,
      expectedWebAppUrl,
      menuButtonUrl: menuUrl,
      menuButtonOk: menuUrlOk,
      webhookUrl,
      webhookOk,
      pendingUpdates: webhook.result?.pending_update_count ?? 0,
      setupUrl: process.env.SETUP_SECRET
        ? `${expectedWebAppUrl}/api/setup?secret=SETUP_SECRET`
        : null,
      hint: !menuUrlOk || !webhookOk
        ? "Call /api/setup?secret=YOUR_SETUP_SECRET once to register the mini app URL and webhook for this bot."
        : "Telegram wiring looks correct. Open the mini app from the keyboard button in chat.",
    });
  } catch (err) {
    json(res, 200, {
      ok: false,
      telegramConfigured: true,
      expectedWebAppUrl,
      error: err instanceof Error ? err.message : String(err),
      hint: "TELEGRAM_BOT_TOKEN is set but invalid. Use the token for @travelagent from BotFather.",
    });
  }
}
