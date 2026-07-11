/** Final traveller delivery: only runs after research and approval are complete. */

import { chat, type ChatMessage } from "../shared/llm.js";
import type { TravellerProfile, TripPlan } from "../shared/schemas.js";

export type TripDeliveryState = "researching" | "awaiting-approval" | "finalized";

export interface TourGuide {
  narrate(plan: TripPlan, profile: TravellerProfile): Promise<string>;
}

export class OpenAITourGuide implements TourGuide {
  constructor(private readonly chatFn: (messages: ChatMessage[]) => Promise<string> = chat) {}

  narrate(plan: TripPlan, profile: TravellerProfile): Promise<string> {
    const itinerary = plan.itinerary.map((day) => `${day.date}: ${day.items.map((item) => item.kind === "activity" ? item.title : item.kind === "hotel" ? item.name : `${item.from} to ${item.to}`).join("; ")}`).join("\n");
    const interests = profile.activities.categories?.join(", ") || "their stated preferences";
    return this.chatFn([
      { role: "system", content: "You are Hermes Tour Guide. Give a warm, practical day-by-day briefing from finalized itinerary facts only. Never invent bookings, opening hours, prices, or availability. Keep it under 220 words." },
      { role: "user", content: `Traveller interests: ${interests}\nFinal itinerary:\n${itinerary}` },
    ]);
  }
}

export interface PdfRenderer { render(plan: TripPlan, narration: string): Promise<Uint8Array>; }
export interface VoiceMemo { synthesize(text: string): Promise<Uint8Array>; }
export interface TelegramPublisher { sendPdf(filename: string, content: Uint8Array): Promise<void>; sendVoice(filename: string, content: Uint8Array): Promise<void>; }

/** Concrete ElevenLabs TTS adapter; it is called only by final delivery. */
export class ElevenLabsVoiceMemo implements VoiceMemo {
  constructor(private readonly apiKey: string, private readonly voiceId: string, private readonly fetcher: typeof fetch = fetch) {}
  async synthesize(text: string): Promise<Uint8Array> {
    const response = await this.fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": this.apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    });
    if (!response.ok) throw new Error(`ElevenLabs synthesis failed (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }
}

/** Ordering is intentional: finalized plan -> Tour Guide -> PDF + voice -> Telegram. */
export class FinalTripDelivery {
  constructor(private readonly deps: { tourGuide: TourGuide; pdf: PdfRenderer; voice: VoiceMemo; telegram: TelegramPublisher }) {}
  async deliver(state: TripDeliveryState, plan: TripPlan, profile: TravellerProfile): Promise<{ narration: string }> {
    if (state !== "finalized") throw new Error("PDF and voice delivery are available only after the itinerary is finalized");
    if (plan.itinerary.length === 0) throw new Error("Cannot deliver an empty finalized itinerary");
    const narration = await this.deps.tourGuide.narrate(plan, profile);
    const [pdf, voice] = await Promise.all([this.deps.pdf.render(plan, narration), this.deps.voice.synthesize(narration)]);
    await this.deps.telegram.sendPdf(`${plan.tripId}-itinerary.pdf`, pdf);
    await this.deps.telegram.sendVoice(`${plan.tripId}-tour-guide.mp3`, voice);
    return { narration };
  }
}
