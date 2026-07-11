import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createMem0Client } from "../../shared/mem0-client.js";
import { chat } from "../../shared/llm.js";
import {
  getOnboardingModel,
  getTelegramBotToken,
  getWebAppUrl,
  isGoogleConfigured,
  isMem0Configured,
  getTelegramAllowUnsafeUser,
} from "../../shared/env.js";
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
  handleConnectDestination,
  handleConnectCities,
  handleConnectLocation,
  handleConnectPaste,
  handleConnectSources,
  handleConnectStatus,
  handleGoogleAuthUrl,
  handleGoogleCallback,
  handleGoogleStart,
  handleSessionBootstrap,
} from "./connect-handlers.js";
import {
  resolveTelegramUser,
  telegramUserId,
  type TelegramWebAppUser,
} from "./init-data.js";
import { processTelegramUpdate, syncTelegramMenuButton, tgApi } from "./telegram-bot.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WEB_ROOT = join(__dirname, "../../../../web/taste-swipe");
const mem0 = createMem0Client();

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

async function serveStatic(res: ServerResponse, urlPath: string) {
  const rel =
    urlPath === "/" || urlPath === "" ? "index.html" : urlPath.replace(/^\//, "");
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
  const existing = await mem0.getProfile(userId);
  let profile;
  let recapFacts: string[];
  let mem0Saved = false;
  try {
    ({ profile, recapFacts } = await onboardFromSwipes(userId, swipes, { mem0 }));
    mem0Saved = Boolean(await mem0.getProfile(userId));
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Could not save taste profile to Mem0",
        hint: err instanceof Error ? err.message : "Mem0 write failed",
      }),
    );
    return;
  }

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
      mem0Saved,
      saved: {
        destinationCity: profile.destinationCity ?? existing?.destinationCity ?? null,
        location: profile.location?.city ?? existing?.location?.city ?? null,
        connected: profile.connectedSources?.map((s) => s.id) ?? [],
        swipeCount: swipes.length,
      },
      location: profile.location?.city,
      connected: profile.connectedSources?.map((s) => s.id) ?? [],
    }),
  );
}

/** Route HTTP requests (Node server + Vercel serverless). */
export async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          webAppUrl: getWebAppUrl(),
          googleConfigured: isGoogleConfigured(),
          mem0Configured: isMem0Configured(),
          allowUnsafeUser: getTelegramAllowUnsafeUser(),
          vercel: process.env.VERCEL === "1",
        }),
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/telegram/webhook") {
      try {
        const raw = await readBody(req);
        const update = JSON.parse(raw) as Record<string, unknown>;
        await processTelegramUpdate(update);
      } catch (err) {
        console.error("Webhook update error:", err);
      }
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

    if (req.method === "POST" && url.pathname === "/api/connect/google/url") {
      await handleGoogleAuthUrl(req, res);
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

    if (req.method === "POST" && url.pathname === "/api/connect/destination") {
      await handleConnectDestination(req, res, mem0);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/connect/cities") {
      await handleConnectCities(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/connect/paste") {
      await handleConnectPaste(req, res, mem0);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/session/bootstrap") {
      await handleSessionBootstrap(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/onboarding/swipes") {
      await handleSwipes(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/setup") {
      const secret = url.searchParams.get("secret");
      if (!secret || secret !== process.env.SETUP_SECRET) {
        res.writeHead(401).end("unauthorized");
        return;
      }
      await registerTelegramWebhook();
      await syncTelegramMenuButton();
      const menu = (await tgApi("getChatMenuButton")) as {
        result?: { web_app?: { url?: string } };
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          webAppUrl: getWebAppUrl(),
          menuButtonUrl: menu.result?.web_app?.url ?? null,
        }),
      );
      return;
    }

    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      await serveStatic(res, url.pathname);
      return;
    }

    res.writeHead(405).end();
  } catch (err) {
    console.error("Request error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

export async function registerTelegramWebhook(): Promise<void> {
  const webhookUrl = `${getWebAppUrl()}/api/telegram/webhook`;
  await tgApi("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
}
