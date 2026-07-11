import { chat } from "../../shared/llm.js";
import { getTelegramBotToken, getWebAppUrl } from "../../shared/env.js";
import { createMem0Client } from "../../shared/mem0-client.js";
import {
  hasTasteProfile,
  profilePromptContext,
} from "../../shared/profile-prompt.js";
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

function simplePdf(title: string, body: string): Uint8Array {
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const words = `${title}\n\n${body}`.replace(/\*/g, "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 72) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  const stream = `BT\n/F1 12 Tf\n50 760 Td\n16 TL\n${lines.map((l, i) => `${i ? "T*\n" : ""}(${esc(l)}) Tj`).join("\n")}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output));
    output += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(output));
}

async function sendFreeTimeAssets(chatId: number, reply: string) {
  const token = getTelegramBotToken();
  const pdf = new Blob([simplePdf("Hermes recommendation", reply)], {
    type: "application/pdf",
  });
  const document = new FormData();
  document.set("chat_id", String(chatId));
  document.set("document", pdf, "hermes-recommendation.pdf");
  await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: document,
  });

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!elevenKey || !voiceId) return;

  const voice = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text: reply, model_id: "eleven_multilingual_v2" }),
  });
  if (!voice.ok) return;

  const audio = new Blob([await voice.arrayBuffer()], { type: "audio/mpeg" });
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("voice", audio, "hermes-recommendation.mp3");
  await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
    method: "POST",
    body: form,
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

async function handleStart(chatId: number, firstName: string, userId: string) {
  const profile = await mem0.getProfile(userId);
  const saved = hasTasteProfile(profile);
  const locationLine = profile?.location?.city
    ? `\n\nI already have you in *${profile.location.city}*`
    : "";
  const connected =
    profile?.connectedSources?.filter((s) => s.status === "connected").map((s) => s.id) ?? [];
  const connectedLine = connected.length
    ? ` with ${connected.join(", ")} connected.`
    : saved
      ? " with your taste on file."
      : ".";

  await sendMessage(
    chatId,
    `Welcome to *Hermes*, ${firstName}.\n\n` +
      `I suggest what to do when you land somewhere new with a few hours free — ` +
      `based on *your* taste, calendar, and location.${saved ? locationLine + connectedLine : ""}\n\n` +
      (saved
        ? `Tell me where you are and how much time you have, or tap below to refresh your profile.`
        : `Tap *🎯 Build taste profile* to connect Google, share your location, then swipe your preferences.`),
    { reply_markup: webAppKeyboard() },
  );
}

async function handleConcierge(chatId: number, userId: string, text: string) {
  const profile = await mem0.getProfile(userId);
  if (!hasTasteProfile(profile)) {
    await sendMessage(
      chatId,
      `I'd love to suggest something — but I don't know your taste yet.\n\nTap *🎯 Build taste profile* first (connect Google, share location, swipe — ~2 min), then come back and tell me where you are.`,
      { reply_markup: webAppKeyboard() },
    );
    return;
  }

  const reply = await chat([
    {
      role: "system",
      content:
        `You are Hermes, a premium day-travel concierge. The traveller's durable taste profile is loaded from Mem0 — use it for every suggestion. ` +
        `Suggest 2-3 specific things for their free hours. Be concrete (neighbourhoods, food, vibe). Keep it Telegram-friendly.`,
    },
    {
      role: "user",
      content: `Request: "${text}"\nMem0 profile: ${profilePromptContext(profile!)}`,
    },
  ]);

  await sendMessage(chatId, reply);
  await sendFreeTimeAssets(chatId, reply);
}

async function handleWebAppData(userId: string, data: string) {
  try {
    const { swipes } = JSON.parse(data) as { swipes: SwipeInput[] };
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
    await handleWebAppData(userId, data);
    return;
  }

  const text = (msg.text as string) ?? "";

  if (text.startsWith("/start")) {
    await handleStart(chatId, from.first_name, userId);
    return;
  }

  if (text.trim()) {
    await handleConcierge(chatId, userId, text);
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
