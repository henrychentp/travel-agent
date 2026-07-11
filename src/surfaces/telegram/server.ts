/**
 * Hermes Telegram bot + Mini App server.
 *
 *   npm run telegram
 *
 * Serves the taste-swipe web app and handles swipe submissions.
 * Requires TELEGRAM_BOT_TOKEN + WEBAPP_URL in .env.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createMem0Client } from "../../shared/mem0-client.js";
import { chat } from "../../shared/llm.js";
import { getOnboardingModel, getTelegramBotToken, getWebAppUrl, getServerPort, isGoogleConfigured, getTelegramAllowUnsafeUser, useTelegramWebhook } from "../../shared/env.js";
import {
  SWIPE_DECK,
  SWIPE_ROUNDS,
} from "../../skills/onboarding/swipe-cards.js";
import {
  formatSwipeRecap,
  onboardFromSwipes,
  type SwipeInput,
} from "../../skills/onboarding/swipe.js";
import {
  handleConnectLocation,
  handleConnectPaste,
  handleConnectSources,
  handleConnectStatus,
  handleGoogleCallback,
  handleGoogleStart,
} from "./connect-handlers.js";
import {
  parseTelegramUser,
  resolveTelegramUser,
  telegramUserId,
  type TelegramWebAppUser,
} from "./init-data.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WEB_ROOT = join(__dirname, "../../../../web/taste-swipe");
const mem0 = createMem0Client();

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

/* ------------------------------------------------------------------ */
/* Telegram Bot API helpers                                           */
/* ------------------------------------------------------------------ */

async function tgApi(method: string, body?: Record<string, unknown>) {
  const token = getTelegramBotToken();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(`Telegram API ${method}: ${data.description}`);
  return data;
}

async function sendMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
) {
  await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...extra,
  });
}

function webAppKeyboard() {
  const url = getWebAppUrl();
  return {
    keyboard: [
      [{ text: "🎯 Build taste profile", web_app: { url } }],
      [{ text: "📍 I have free time — suggest something" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/* ------------------------------------------------------------------ */
/* HTTP handlers                                                      */
/* ------------------------------------------------------------------ */

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  urlPath: string,
) {
  const rel = urlPath === "/" || urlPath === "" ? "index.html" : urlPath.replace(/^\//, "");
  const filePath = join(WEB_ROOT, rel);
  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "text/plain",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

async function handleSwipes(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const { initData, unsafeUser, resumeToken, swipes } = JSON.parse(raw) as {
    initData: string;
    unsafeUser?: TelegramWebAppUser;
    resumeToken?: string;
    swipes: SwipeInput[];
  };

  const tgUser = resolveTelegramUser(
    initData,
    getTelegramBotToken(),
    unsafeUser,
    resumeToken,
  );
  if (!tgUser) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Could not verify Telegram session" }));
    return;
  }

  const userId = telegramUserId(tgUser);
  const { profile, recapFacts } = await onboardFromSwipes(userId, swipes, {
    mem0,
  });

  let recap = formatSwipeRecap(recapFacts);
  try {
    recap = await chat(
      [
        {
          role: "system",
          content: `You are Hermes, a premium day-travel concierge. The traveller just finished onboarding in the mini app. Write a warm, concise recap (3-4 sentences + 3 short bullets). They use us when landed in a city with a few free hours. End with one example question they could ask later in chat.`,
        },
        {
          role: "user",
          content: `Name: ${tgUser.first_name}. Learned: ${recapFacts.join("; ")}. Profile: ${JSON.stringify({ pace: profile.pace, food: profile.food, activities: profile.activities, location: profile.location, connectedSources: profile.connectedSources })}`,
        },
      ],
      { model: getOnboardingModel() },
    );
  } catch {
    /* fallback */
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      userId,
      recap,
      location: profile.location?.city,
      connected: profile.connectedSources?.map((s) => s.id) ?? [],
    }),
  );
}

async function syncTelegramMenuButton() {
  const url = getWebAppUrl();
  try {
    await tgApi("setChatMenuButton", {
      menu_button: {
        type: "web_app",
        text: "Build taste profile",
        web_app: { url },
      },
    });
    console.log(`Menu button     synced → ${url}`);
  } catch (err) {
    console.warn("Could not sync menu button:", err);
  }
}

async function handleStart(chatId: number, firstName: string) {
  await sendMessage(
    chatId,
    `Welcome to *Hermes*, ${firstName}.\n\n` +
      `I suggest what to do when you land somewhere new with a few hours free — ` +
      `based on *your* taste, calendar, and location.\n\n` +
      `Tap *🎯 Build taste profile* to connect Google, share your location, then swipe your preferences.`,
    { reply_markup: webAppKeyboard() },
  );
}

async function handleFreeTime(chatId: number, userId: string, text: string) {
  const profile = await mem0.getProfile(userId);
  if (!profile || Object.keys(profile.confidence).length < 3) {
    await sendMessage(
      chatId,
      `I'd love to suggest something — but I don't know your taste yet.\n\nTap *🎯 Build taste profile* first (2 min swipe), then come back and tell me where you are.`,
      { reply_markup: webAppKeyboard() },
    );
    return;
  }

  const reply = await chat([
    {
      role: "system",
      content: `You are Hermes, a premium day-travel concierge. Suggest 2-3 specific things for a traveller with a few free hours. Use their taste profile and current location if known. Be concrete (neighbourhoods, food, vibe). Keep it Telegram-friendly.`,
    },
    {
      role: "user",
      content: `Request: "${text}"\nLocation: ${profile.location?.city ?? "unknown"}\nProfile: ${JSON.stringify({ pace: profile.pace, food: profile.food, activities: profile.activities, comfortRisk: profile.comfortRisk, dealBreakers: profile.dealBreakers, notes: profile.notes, connectedSources: profile.connectedSources })}`,
    },
  ]);

  await sendMessage(chatId, reply);
}

async function handleWebAppData(chatId: number, data: string) {
  try {
    const { swipes } = JSON.parse(data) as { swipes: SwipeInput[] };
    const userId = `tg:${chatId}`;
    await onboardFromSwipes(userId, swipes, { mem0 });
  } catch {
    /* recap shown in mini app — no chat spam */
  }
}

async function processUpdate(update: Record<string, unknown>) {
  const msg = update.message as Record<string, unknown> | undefined;
  if (!msg) return;

  const chat = msg.chat as { id: number };
  const from = msg.from as { id: number; first_name: string };
  const chatId = chat.id;
  const userId = telegramUserId(from);

  if (msg.web_app_data) {
    const data = (msg.web_app_data as { data: string }).data;
    await handleWebAppData(chatId, data);
    return;
  }

  const text = (msg.text as string) ?? "";

  if (text.startsWith("/start")) {
    await handleStart(chatId, from.first_name);
    return;
  }

  if (
    text.includes("free time") ||
    text.includes("hours") ||
    text.includes("what should I do") ||
    text.includes("suggest")
  ) {
    await handleFreeTime(chatId, userId, text);
    return;
  }

  await sendMessage(
    chatId,
    `Tell me where you are and how much time you have — e.g. _"3 hours in Barcelona before my flight"_ — or tap below to update your taste profile.`,
    { reply_markup: webAppKeyboard() },
  );
}

/* ------------------------------------------------------------------ */
/* Polling loop                                                       */
/* ------------------------------------------------------------------ */

async function poll(offset = 0) {
  const token = getTelegramBotToken();
  const res = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?timeout=30&offset=${offset}`,
  );
  const data = (await res.json()) as {
    ok: boolean;
    result: Array<{ update_id: number } & Record<string, unknown>>;
  };

  if (!data.ok) return;

  let nextOffset = offset;
  for (const update of data.result) {
    nextOffset = update.update_id + 1;
    try {
      await processUpdate(update);
    } catch (err) {
      console.error("Update error:", err);
    }
  }

  setImmediate(() => poll(nextOffset));
}

/* ------------------------------------------------------------------ */
/* Server                                                             */
/* ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, webAppUrl: getWebAppUrl() }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/telegram/webhook") {
      const raw = await readBody(req);
      const update = JSON.parse(raw) as Record<string, unknown>;
      await processUpdate(update);
      res.writeHead(200).end("ok");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/onboarding/deck") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ cards: SWIPE_DECK, rounds: SWIPE_ROUNDS }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/connect/sources") {
      await handleConnectSources(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/connect/status") {
      await handleConnectStatus(req, res, mem0);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/connect/google/start") {
      await handleGoogleStart(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/connect/google/callback") {
      await handleGoogleCallback(req, res, mem0);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/connect/location") {
      await handleConnectLocation(req, res, mem0);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/connect/paste") {
      await handleConnectPaste(req, res, mem0);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/onboarding/swipes") {
      await handleSwipes(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(req, res, url.pathname);
      return;
    }

    res.writeHead(405).end();
  } catch (err) {
    console.error("Request error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

const port = getServerPort();
server.listen(port, "0.0.0.0", async () => {
  console.log(`Hermes server  http://0.0.0.0:${port}`);
  console.log(`Mini App URL   ${getWebAppUrl()}`);
  console.log(`Unsafe user    ${getTelegramAllowUnsafeUser() ? "enabled" : "disabled"}`);
  console.log(`Google OAuth   ${isGoogleConfigured() ? "configured" : "NOT SET — add GOOGLE_CLIENT_ID/SECRET"}`);
  try {
    if (useTelegramWebhook()) {
      const webhookUrl = `${getWebAppUrl()}/api/telegram/webhook`;
      await tgApi("setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      });
      console.log(`Telegram bot   webhook → ${webhookUrl}`);
    } else {
      await tgApi("deleteWebhook", { drop_pending_updates: true });
      console.log(`Telegram bot   polling (local dev)`);
      poll();
    }
    await syncTelegramMenuButton();
  } catch (err) {
    console.warn("Telegram setup error:", err);
  }
});
