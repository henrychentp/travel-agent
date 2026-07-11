import type { TravellerProfile } from "./schemas.js";

/** True when the traveller has enough saved taste to personalize suggestions. */
export function hasTasteProfile(profile: TravellerProfile | null): boolean {
  if (!profile) return false;
  if (profile.destinationCity) return true;
  if (profile.location?.city) return true;
  if (profile.connectedSources?.some((s) => s.status === "connected")) return true;
  if (Object.keys(profile.confidence).length > 0) return true;
  if (profile.notes.length > 0) return true;
  return false;
}

/** Compact profile snapshot for LLM prompts (Telegram concierge, recaps). */
export function profilePromptContext(profile: TravellerProfile): string {
  return JSON.stringify({
    destinationCity: profile.destinationCity ?? null,
    location: profile.location ?? null,
    connectedSources: profile.connectedSources?.map((s) => s.id) ?? [],
    pace: profile.pace,
    food: profile.food,
    activities: profile.activities,
    comfortRisk: profile.comfortRisk,
    dealBreakers: profile.dealBreakers,
    transport: profile.transport,
    accommodation: profile.accommodation,
    notes: profile.notes.slice(-12),
    evidence: profile.evidence.slice(-8).map((e) => e.detail),
  });
}
