import { chat, type ChatMessage } from "../../shared/llm.js";
import type { TravellerProfile } from "../../shared/schemas.js";

export interface MomentContext {
  location: string;
  startAt: string;
  endAt: string;
}

/** Extract a local, same-day 6–8 hour window; 22:00 is a non-negotiable cutoff. */
export async function extractMomentContext(
  text: string,
  profile: TravellerProfile,
  now = new Date(),
  chatFn: (messages: ChatMessage[]) => Promise<string> = chat,
): Promise<MomentContext> {
  const fallbackLocation = profile.location?.city ?? profile.identity.homeCity;
  const fallbackDate = now.toISOString().slice(0, 10);
  const fallbackTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  try {
    const raw = await chatFn([
      { role: "system", content: "Extract a spontaneous local travel plan context. Reply with JSON only: {location, date, time, hours}. Resolve relative wording using the supplied current UTC time. hours must be 6, 7, or 8. The location is where the traveller is now, not their home city." },
      { role: "user", content: `Current UTC: ${now.toISOString()}\nKnown current city: ${fallbackLocation ?? "unknown"}\nTraveller message: ${text}` },
    ]);
    const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as { location?: string; date?: string; time?: string; hours?: number };
    const location = parsed.location?.trim() || fallbackLocation;
    if (!location || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? "") || !/^\d{2}:\d{2}$/.test(parsed.time ?? "")) throw new Error("incomplete context");
    return windowFor(location, parsed.date!, parsed.time!, parsed.hours ?? 8);
  } catch {
    if (!fallbackLocation) throw new Error("Tell me which city you are in so I can plan the next few hours.");
    return windowFor(fallbackLocation, fallbackDate, fallbackTime, 8);
  }
}

export function windowFor(location: string, date: string, time: string, requestedHours: number): MomentContext {
  const start = new Date(`${date}T${time}:00`);
  const cutoff = new Date(`${date}T22:00:00`);
  if (start >= cutoff) throw new Error("It is already 22:00 or later locally; Hermes will not plan past the cutoff.");
  const hours = Math.max(6, Math.min(8, requestedHours));
  const proposed = new Date(start.getTime() + hours * 3_600_000);
  const end = proposed < cutoff ? proposed : cutoff;
  return { location, startAt: toLocalIso(start), endAt: toLocalIso(end) };
}

function toLocalIso(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:00`;
}
