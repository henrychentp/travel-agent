import { chat } from "../../shared/llm.js";
import { getTelegramBotToken, getWebAppUrl } from "../../shared/env.js";
import { createMem0Client } from "../../shared/mem0-client.js";
import {
  onboardFromSwipes,
  type SwipeInput,
} from "../../skills/onboarding/swipe.js";
import { telegramUserId } from "./init-data.js";

const mem0 = createMem0Client();

export async function tgApi(method: string, body?: Record<string, unknown>) {
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

export async function syncTelegramMenuButton(): Promise<void> {
  const url = getWebAppUrl();
  await tgApi("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Build taste profile",
      web_app: { url },
    },
  });
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
    /* recap shown in mini app */
  }
}

export async function processTelegramUpdate(update: Record<string, unknown>) {
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

export async function pollTelegram(offset = 0): Promise<void> {
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
      await processTelegramUpdate(update);
    } catch (err) {
      console.error("Update error:", err);
    }
  }

  setImmediate(() => pollTelegram(nextOffset));
}
