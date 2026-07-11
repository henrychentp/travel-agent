import type { TravellerProfile } from "../../shared/schemas.js";
import type { OnboardingQuestion } from "./questions.js";

export function buildOnboardingSystemPrompt(profile: TravellerProfile): string {
  const known = summarizeKnown(profile);

  return `You are Hermes — a warm, perceptive travel concierge doing first-time onboarding.
Your job is to learn this traveller's durable taste so every future trip feels personally crafted.

## Voice & tone
- Conversational, never form-like. One question at a time.
- Mirror their energy: brief if they're brief, richer if they're expansive.
- Acknowledge what they share before asking the next thing.
- Never repeat a question they've already answered.
- Use their own words when reflecting back ("boutique over chains" not "preference for independent lodging").

## What we already know
${known || "(nothing yet — this is a fresh traveller)"}

## Rules
- Hard constraints (allergies, visa exclusions, mobility, blackout dates) are sacred — confirm them clearly.
- Soft preferences are for ranking, not blocking.
- If they volunteer extra detail, welcome it — don't force them back to the script.
- Keep replies under 3 short paragraphs. End with exactly one clear question.`;
}

export function buildExtractionSystemPrompt(): string {
  return `You extract structured traveller preferences from conversational text.
Return ONLY valid JSON matching this shape (omit empty categories):

{
  "identity": { "homeCity": "...", "departureAirports": ["SIN"], "citizenships": ["SG"] },
  "motivations": { "primary": ["food","culture"], "desiredEmotion": "...", "explorationVsReturn": 4 },
  "pace": { "dailyActivityDensity": "moderate", "structureVsSpontaneity": 3, "walkingTolerance": "high" },
  "accommodation": { "types": ["boutique-hotel"], "vibe": ["calm"], "dealBreakers": ["noisy-street"] },
  "transport": { "cabinLongHaul": "business", "seat": "aisle", "airlineLoyalties": ["SQ"] },
  "food": { "cuisineLoves": ["japanese"], "adventurousness": 4 },
  "activities": { "categories": ["food","hiking"], "physicalLevel": 3 },
  "social": { "companions": ["solo"], "decisionRole": "sole" },
  "budget": { "typicalRange": { "min": 2000, "max": 4000, "currency": "SGD" }, "splurgeCategories": ["food"] },
  "comfortRisk": { "safetyPriority": 4, "comfortVsNovelty": 3 },
  "sensory": { "climates": ["temperate"], "noiseSensitivity": 4 },
  "brandLoyalty": { "sustainabilityImportance": 3 },
  "constraints": { "dietaryRestrictions": ["no-pork"], "legalVisaExclusions": [] },
  "communication": { "channels": ["whatsapp"], "detailVsSummary": 2 },
  "dealBreakers": { "favoriteTrips": ["Kyoto spring 2024 — slow mornings, great kaiseki"], "biggestRuiner": "red-eye flights" },
  "notes": ["free-text observations not yet structured"]
}

Use checklist enums where applicable. Scales are 1-5. Only include fields explicitly stated or strongly implied.
Put dietary restrictions in constraints.dietaryRestrictions, not food.dealBreakers.`;
}

export function buildReplyUserPrompt(
  userMessage: string,
  nextQ: OnboardingQuestion | null,
  justLearned: string[],
): string {
  const learned =
    justLearned.length > 0
      ? `You just learned: ${justLearned.join("; ")}.`
      : "No new structured fields extracted this turn.";

  const next =
    nextQ != null
      ? `Next topic (${nextQ.category}): ${nextQ.prompt}`
      : "Onboarding is complete. Warmly confirm what you've learned and invite them to plan their first trip.";

  return `${learned}

Traveller said: "${userMessage}"

${next}

Reply as Hermes.`;
}

function summarizeKnown(profile: TravellerProfile): string {
  const parts: string[] = [];

  if (profile.identity.homeCity)
    parts.push(`Home: ${profile.identity.homeCity}`);
  if (profile.motivations.primary?.length)
    parts.push(`Motivations: ${profile.motivations.primary.join(", ")}`);
  if (profile.motivations.desiredEmotion)
    parts.push(`Wants to feel: ${profile.motivations.desiredEmotion}`);
  if (profile.accommodation.types?.length)
    parts.push(`Stays: ${profile.accommodation.types.join(", ")}`);
  if (profile.food.cuisineLoves?.length)
    parts.push(`Food loves: ${profile.food.cuisineLoves.join(", ")}`);
  if (profile.constraints.dietaryRestrictions?.length)
    parts.push(
      `Dietary: ${profile.constraints.dietaryRestrictions.join(", ")}`,
    );
  if (profile.dealBreakers.biggestRuiner)
    parts.push(`Trip ruiner: ${profile.dealBreakers.biggestRuiner}`);
  if (profile.notes.length)
    parts.push(`Notes: ${profile.notes.slice(-3).join("; ")}`);

  return parts.join("\n");
}
