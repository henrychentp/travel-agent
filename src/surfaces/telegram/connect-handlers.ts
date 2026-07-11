import type { IncomingMessage, ServerResponse } from "node:http";
import type { Mem0Client } from "../../shared/mem0-client.js";
import { CONNECTORS } from "../../shared/import-schemas.js";
import {
  applyImport,
  buildLocation,
  reverseGeocode,
} from "../../skills/onboarding/import-context.js";
import {
  exchangeGoogleCode,
  fetchGoogleSignals,
  getGoogleEnv,
  googleAuthUrl,
  saveGoogleTokens,
} from "../../skills/onboarding/google.js";
import {
  issueResumeToken,
  resolveTelegramUser,
  telegramUserId,
  type TelegramWebAppUser,
} from "./init-data.js";
import { getTelegramBotToken, getWebAppUrl } from "../../shared/env.js";

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

export async function handleConnectSources(
  _req: IncomingMessage,
  res: ServerResponse,
) {
  json(res, 200, {
    connectors: CONNECTORS,
    googleConfigured: getGoogleEnv() !== null,
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
    city: location.city,
    country: location.country,
    message: location.city
      ? `Location saved — you're in ${location.city}.`
      : "Location saved.",
  });
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
    const resume = userId
      ? `&resume=${encodeURIComponent(issueResumeToken(userId, getTelegramBotToken()))}`
      : "";
    res.writeHead(302, {
      Location: `${getWebAppUrl()}/?google=error${resume}`,
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
    googleConfigured: getGoogleEnv() !== null,
  });
}
