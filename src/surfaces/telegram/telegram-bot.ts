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
import { Hermes } from "../../orchestrator/index.js";
import type { TripPlan, TripRequest, TravellerProfile } from "../../shared/schemas.js";
import { extractMomentContext } from "../../skills/concierge/moment-context.js";

const mem0 = createMem0Client();
const hermes = new Hermes({ mem0 });

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

async function uploadTelegramAsset(token: string, method: "sendDocument" | "sendVoice", form: FormData): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;
  if (!response.ok || !result?.ok) {
    throw new Error(`Telegram ${method} failed: ${result?.description ?? response.status}`);
  }
}

/**
 * Deliver the final assets after planning has completed. A delivery-provider
 * outage must never discard an otherwise valid itinerary.
 */
async function sendFinalAssets(chatId: number, itinerary: string, narration: string): Promise<void> {
  const token = getTelegramBotToken();
  const pdf = new Blob([simplePdf("Hermes itinerary", itinerary)], {
    type: "application/pdf",
  });
  const document = new FormData();
  document.set("chat_id", String(chatId));
  document.set("document", pdf, "hermes-recommendation.pdf");
  await uploadTelegramAsset(token, "sendDocument", document);

  // A PDF is useful on its own. Send it before checking voice configuration so
  // a missing ElevenLabs setting never withholds the final itinerary document.
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!elevenKey || !voiceId) {
    throw new Error("Demo delivery requires ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.");
  }
  const voice = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    // 140–155 words is approximately one minute at the default narration pace.
    body: JSON.stringify({ text: narration, model_id: "eleven_multilingual_v2" }),
  });
  if (!voice.ok) throw new Error(`ElevenLabs returned ${voice.status}: ${(await voice.text()).slice(0, 300)}`);

  const audio = new Blob([await voice.arrayBuffer()], { type: "audio/mpeg" });
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("voice", audio, "hermes-recommendation.mp3");
  await uploadTelegramAsset(token, "sendVoice", form);
}

function deliveryFailureMessage(error: unknown): string {
  const reason = error instanceof Error ? error.message : "an unknown delivery error";
  if (reason.includes("ELEVENLABS_API_KEY") || reason.includes("ELEVENLABS_VOICE_ID")) {
    return "Voice briefing is not configured yet.";
  }
  if (reason.includes("ElevenLabs returned")) {
    return "ElevenLabs could not create the voice briefing.";
  }
  if (reason.includes("Telegram sendDocument")) return "Telegram could not upload the PDF.";
  if (reason.includes("Telegram sendVoice")) return "Telegram could not upload the voice briefing.";
  return "The PDF or voice briefing could not be delivered.";
}

function demoRequest(profile: TravellerProfile): TripRequest {
  const saved = profile.notes.find((note) => note.startsWith("trip-context:"));
  let trip: { city?: string; startDate?: string; endDate?: string; travellers?: number } = {};
  try { if (saved) trip = JSON.parse(saved.slice("trip-context:".length)); } catch { /* use fallback */ }
  const destination =
    trip.city ?? profile.destinationCity ??
    profile.location?.city ??
    profile.identity.homeCity ??
    "Lisbon";
  const start = trip.startDate ? new Date(`${trip.startDate}T12:00:00Z`) : new Date();
  start.setUTCDate(start.getUTCDate() + 21);
  const startDate = start.toISOString().slice(0, 10);
  const fallbackEnd = new Date(start);
  fallbackEnd.setUTCDate(fallbackEnd.getUTCDate() + 2);
  const fallbackEndDate = fallbackEnd.toISOString().slice(0, 10);
  // A stale end date from an earlier onboarding pass must never create an
  // impossible trip range. Keep a valid selected end date; otherwise use a
  // short demo window after the selected start.
  const endDate = trip.endDate && trip.endDate >= startDate
    ? trip.endDate
    : fallbackEndDate;
  return {
    destination,
    startDate,
    endDate,
    travellers: trip.travellers ?? 1,
    confirmedBookings: [
      { kind: "flight", from: profile.identity.homeCity ?? "Home", to: destination, depart: `${startDate}T11:00:00`, arrive: `${startDate}T14:00:00`, ref: "DEMO-INBOUND" },
      { kind: "hotel", name: `${destination} design hotel`, checkIn: startDate, checkOut: endDate, location: destination, ref: "DEMO-HOTEL" },
      { kind: "activity", title: "Protected dinner reservation", date: startDate, startAt: `${startDate}T19:30:00`, endAt: `${startDate}T21:00:00`, location: destination },
      { kind: "flight", from: destination, to: profile.identity.homeCity ?? "Home", depart: `${endDate}T16:00:00`, arrive: `${endDate}T19:00:00`, ref: "DEMO-RETURN" },
    ],
  };
}

function formatItinerary(plan: TripPlan): string {
  const days = plan.itinerary.map((day) => {
    const items = day.items.map((item) => {
      if (item.kind === "flight") return `• Flight: ${item.from} → ${item.to} (${item.depart})`;
      if (item.kind === "hotel") return `• Stay: ${item.name}`;
      return `• ${item.startAt ? `${item.startAt.slice(11, 16)} — ` : ""}${item.title}${item.location ? `, ${item.location}` : ""}`;
    });
    return items.length ? `*${day.date}*\n${items.join("\n")}` : "";
  }).filter(Boolean);

  const demoFallback = [
    `*${plan.request.startDate} — arrive gently*\n• Check in, settle in, and take a short neighbourhood orientation walk.\n• Keep dinner flexible near the hotel.`,
    `*${plan.request.endDate} — one cultural anchor*\n• Choose one museum, landmark, or local food experience matched to your saved taste.\n• Leave time for a relaxed coffee and an unhurried return.`,
  ];
  const schedule = days.length ? days : demoFallback;
  return `*Your demo itinerary — fictional and unbooked*\n${plan.request.destination} · ${plan.request.startDate} to ${plan.request.endDate}\n\n${schedule.join("\n\n")}\n\nProtected flight, hotel, and dinner anchors are preserved. No booking has been made.`;
}

function fallbackItinerary(request: TripRequest): string {
  const endDate = request.endDate >= request.startDate
    ? request.endDate
    : request.startDate;
  return `*Your demo itinerary — fictional and unbooked*\n${request.destination} · ${request.startDate} to ${endDate}\n\n*${request.startDate} — arrive gently*\n• Check in, settle in, and explore one nearby neighbourhood at an easy pace.\n• Keep dinner flexible near your hotel.\n\n*${endDate} — cultural anchor*\n• Choose one museum, landmark, or food experience that suits your taste profile.\n• Leave time for a coffee stop and a relaxed return.\n\nThis is a demo outline. No booking has been made.`;
}

async function oneMinuteBriefing(plan: TripPlan, profile: TravellerProfile): Promise<string> {
  const fallback = `Welcome to your ${plan.request.destination} itinerary. Your plan keeps your confirmed travel and dinner plans protected, with a measured pace around the experiences that suit you best. Each day leaves room for practical transfers and a proper pause, so the trip feels effortless rather than over-scheduled. Check the attached PDF for the full plan, and make any booking decisions only when you are ready.`;
  try {
    return await chat([
      { role: "system", content: "You are Hermes Tour Guide. Write a warm, practical travel voice memo of 140 to 155 words from finalized itinerary facts and the traveller's saved taste. Never invent a booking, availability, price, or opening hour." },
      { role: "user", content: `Taste: ${profilePromptContext(profile)}\nItinerary:\n${formatItinerary(plan)}` },
    ]);
  } catch {
    return fallback;
  }
}

/** Run the post-onboarding demo from either a Telegram callback or the Mini App API. */
export async function runOnboardingDemo(chatId: number, userId: string): Promise<void> {
  // Hosted Mem0 writes are asynchronous. The Mini App save and Telegram
  // callback may land in different processes, so wait briefly for the newly
  // persisted profile rather than falling back to a fixture.
  let profile = await mem0.getProfile(userId);
  for (let attempt = 0; !hasTasteProfile(profile) && attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    profile = await mem0.getProfile(userId);
  }
  if (!hasTasteProfile(profile)) {
    await sendMessage(chatId, "Your profile was not ready yet. Please reopen *🎯 Build taste profile* and complete the swipes.", { reply_markup: webAppKeyboard() });
    return;
  }
  await sendMessage(chatId, "Your taste profile is saved. I’m researching and building your personalised demo itinerary now…");
  const request = demoRequest(profile!);
  let itinerary: string;
  try {
    itinerary = formatItinerary(await hermes.plan(userId, request));
  } catch (error) {
    console.error("Hermes demo planning failed; sending fallback itinerary", error);
    itinerary = fallbackItinerary(request);
  }
  await sendMessage(chatId, itinerary);
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
  const destinationLine = profile?.destinationCity
    ? `\n\nDestination on file: *${profile.destinationCity}*`
    : "";
  const locationLine = profile?.location?.city
    ? `\nPrecise location: *${profile.location.city}*`
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
      `First, run */onboarding* to save your travel taste. Then run */demo* to create your itinerary.${saved ? destinationLine + locationLine + connectedLine : ""}\n\n` +
      `1. Send */onboarding* — build or refresh your taste profile.\n` +
      `2. When the taste cards are saved, send */demo* — Hermes creates your itinerary.`,
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

  const moment = await extractMomentContext(text, profile!);
  const date = moment.startAt.slice(0, 10);
  const request: TripRequest = {
    destination: moment.location,
    startDate: date,
    endDate: date,
    travellers: 1,
    dayWindow: { startAt: moment.startAt, endAt: moment.endAt },
  };
  let itinerary: string;
  try {
    itinerary = formatItinerary(await hermes.plan(userId, request));
  } catch (error) {
    console.error("Hermes concierge planning failed; sending fallback itinerary", error);
    itinerary = fallbackItinerary(request);
  }
  await sendMessage(chatId, itinerary);
}

async function handleWebAppData(chatId: number, userId: string, data: string) {
  try {
    const payload = JSON.parse(data) as { type?: string; swipes?: SwipeInput[]; city?: string; location?: string; startDate?: string; endDate?: string; travellers?: number };
    if (payload.swipes?.length) await onboardFromSwipes(userId, payload.swipes, { mem0 });
    if (payload.type === "onboarding-complete") await runOnboardingDemo(chatId, userId);
    if (payload.type === "trip-context" && payload.city && payload.startDate && payload.endDate) {
      await mem0.remember(userId, `trip-context:${JSON.stringify({ city: payload.city, location: payload.location ?? payload.city, startDate: payload.startDate, endDate: payload.endDate, travellers: payload.travellers ?? 1 })}`);
      await runOnboardingDemo(chatId, userId);
    }
  } catch {
    await sendMessage(chatId, "Your profile was saved, but I could not start the itinerary automatically. Reopen the Mini App and tap Back to Hermes chat once more.");
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
    await handleWebAppData(chatId, userId, data);
    return;
  }

  const text = (msg.text as string) ?? "";

  if (text.startsWith("/start")) {
    await handleStart(chatId, from.first_name, userId);
    return;
  }

  if (/^(hi|hello|hey|start)\b/i.test(text.trim())) {
    await handleStart(chatId, from.first_name, userId);
    return;
  }

  if (text.trim().toLowerCase() === "/onboarding") {
    await sendMessage(chatId, "Open the Mini App, complete your taste cards and trip details, then return here and send */demo*.", { reply_markup: webAppKeyboard() });
    return;
  }

  if (text.trim().toLowerCase() === "/demo") {
    await runOnboardingDemo(chatId, userId);
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
