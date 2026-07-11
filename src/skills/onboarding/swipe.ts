import type { Mem0Client } from "../../shared/mem0-client.js";
import type {
  EvidenceEntry,
  OnboardingAnswers,
  TravellerProfile,
  UserId,
} from "../../shared/schemas.js";
import { SWIPE_DECK, type SwipeCard, type SwipeDirection } from "./swipe-cards.js";
import { onboardUser, type OnboardingDeps } from "./index.js";

export interface SwipeInput {
  cardId: string;
  direction: SwipeDirection;
}

export interface SwipeOnboardingResult {
  profile: TravellerProfile;
  recapFacts: string[];
}

const CARD_MAP = new Map(SWIPE_DECK.map((c) => [c.id, c]));

/** Map swipe results into structured onboarding answers + evidence. */
export function swipesToAnswers(swipes: SwipeInput[]): OnboardingAnswers {
  const answers: OnboardingAnswers = {};
  const notes: string[] = [];

  for (const swipe of swipes) {
    const card = CARD_MAP.get(swipe.cardId);
    if (!card) continue;

    const liked = swipe.direction === "right" || swipe.direction === "super";
    const strong = swipe.direction === "super";

    applyCardSwipe(answers, notes, card, liked, strong);
  }

  if (notes.length) answers.notes = notes;
  return answers;
}

export function swipesToEvidence(
  swipes: SwipeInput[],
  at: string,
): EvidenceEntry[] {
  return swipes
    .filter((s) => CARD_MAP.has(s.cardId))
    .map((s) => ({
      at,
      signal: s.direction === "left" ? "swipe-reject" : "swipe-accept",
      detail: `${s.cardId}:${s.direction}`,
    }));
}

/** Persist swipe-derived taste with inferred confidence (0.85). */
export async function onboardFromSwipes(
  userId: UserId,
  swipes: SwipeInput[],
  deps: OnboardingDeps,
): Promise<SwipeOnboardingResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stampedAt = now();
  const answers = swipesToAnswers(swipes);

  const profile = await onboardUser(userId, answers, deps);

  // Swipe-derived categories get lower confidence than stated chat answers.
  for (const swipe of swipes) {
    const card = CARD_MAP.get(swipe.cardId);
    if (!card) continue;
    profile.confidence[card.category] = 0.85;
    profile.lastConfirmed[card.category] = stampedAt;
  }

  const evidence = swipesToEvidence(swipes, stampedAt);
  profile.evidence.push(...evidence);
  profile.updatedAt = stampedAt;
  await deps.mem0.saveProfile(profile);

  return { profile, recapFacts: buildRecapFacts(swipes) };
}

function applyCardSwipe(
  answers: OnboardingAnswers,
  notes: string[],
  card: SwipeCard,
  liked: boolean,
  strong: boolean,
): void {
  const tag = strong ? " (essential)" : "";

  switch (card.id) {
    case "slow-cafe-morning":
      if (liked) {
        answers.pace ??= {};
        answers.pace.dailyActivityDensity = "light";
        answers.pace.structureVsSpontaneity = 2;
        notes.push(`loves slow café mornings${tag}`);
      }
      break;
    case "packed-sightseeing":
      if (liked) {
        answers.pace ??= {};
        answers.pace.dailyActivityDensity = "full";
        answers.pace.structureVsSpontaneity = 4;
      } else {
        answers.pace ??= {};
        answers.pace.dailyActivityDensity = "moderate";
      }
      break;
    case "neighborhood-wander":
      if (liked) {
        answers.motivations ??= {};
        answers.motivations.explorationVsReturn = 5;
        answers.motivations.primary = uniquePush(
          answers.motivations.primary,
          "culture",
        );
        notes.push(`loves spontaneous neighborhood wandering${tag}`);
      }
      break;
    case "spa-reset":
      if (liked) {
        answers.activities ??= {};
        answers.activities.wellness = uniquePush(
          answers.activities.wellness,
          "spa",
        );
        answers.activities.categories = uniquePush(
          answers.activities.categories,
          "wellness",
        );
      }
      break;
    case "street-food":
      if (liked) {
        answers.food ??= {};
        answers.food.adventurousness = 5;
        answers.food.cuisineLoves = uniquePush(
          answers.food.cuisineLoves,
          "street-food",
        );
      } else {
        answers.food ??= {};
        answers.food.adventurousness = Math.min(
          answers.food.adventurousness ?? 3,
          2,
        ) as 2;
      }
      break;
    case "chef-table":
      if (liked) {
        answers.food ??= {};
        answers.food.diningStyle = { fine: 60, casual: 30, informal: 10 };
        answers.food.cuisineLoves = uniquePush(
          answers.food.cuisineLoves,
          "fine-dining",
        );
        answers.budget ??= {};
        answers.budget.splurgeCategories = uniquePush(
          answers.budget.splurgeCategories,
          "food",
        );
      }
      break;
    case "wine-bar":
      if (liked) {
        answers.food ??= {};
        answers.food.alcohol = "wine, natural wines";
        answers.activities ??= {};
        answers.activities.nightlife = "low";
      }
      break;
    case "familiar-chain":
      if (liked) {
        answers.food ??= {};
        answers.food.adventurousness = 1;
        notes.push("prefers familiar food when traveling");
      } else {
        answers.food ??= {};
        answers.food.cuisineAvoids = uniquePush(
          answers.food.cuisineAvoids,
          "chains",
        );
      }
      break;
    case "iconic-landmark":
      if (liked) {
        answers.comfortRisk ??= {};
        answers.comfortRisk.offBeatenPath = 2;
        answers.sensory ??= {};
        answers.sensory.crowdTolerance = 4;
      } else {
        answers.comfortRisk ??= {};
        answers.comfortRisk.offBeatenPath = 4;
        answers.sensory ??= {};
        answers.sensory.crowdTolerance = 2;
      }
      break;
    case "hidden-courtyard":
      if (liked) {
        answers.comfortRisk ??= {};
        answers.comfortRisk.offBeatenPath = 5;
        answers.motivations ??= {};
        answers.motivations.primary = uniquePush(
          answers.motivations.primary,
          "culture",
        );
      }
      break;
    case "contemporary-gallery":
      if (liked) {
        answers.activities ??= {};
        answers.activities.categories = uniquePush(
          answers.activities.categories,
          "museums",
        );
      }
      break;
    case "rooftop-sunset":
      if (liked) {
        answers.accommodation ??= {};
        answers.accommodation.vibe = uniquePush(
          answers.accommodation.vibe,
          "views",
        );
        answers.activities ??= {};
        answers.activities.nightlife = "moderate";
      }
      break;
    case "boutique-design":
      if (liked) {
        answers.accommodation ??= {};
        answers.accommodation.types = uniquePush(
          answers.accommodation.types,
          "boutique-hotel",
        );
        answers.accommodation.vibe = uniquePush(
          answers.accommodation.vibe,
          "design-forward",
        );
        answers.accommodation.chainsVsIndependent = "independents";
      }
      break;
    case "business-efficient":
      if (liked) {
        answers.accommodation ??= {};
        answers.accommodation.types = uniquePush(
          answers.accommodation.types,
          "business-hotel",
        );
        answers.accommodation.amenityMustHaves = uniquePush(
          answers.accommodation.amenityMustHaves,
          "good-wifi",
        );
      }
      break;
    case "walk-everywhere":
      if (liked) {
        answers.pace ??= {};
        answers.pace.walkingTolerance = "high";
        answers.transport ??= {};
        answers.transport.groundTransport = uniquePush(
          answers.transport.groundTransport,
          "walking",
        );
      } else {
        answers.pace ??= {};
        answers.pace.walkingTolerance = "low";
      }
      break;
    case "private-transfer":
      if (liked) {
        answers.transport ??= {};
        answers.transport.groundTransport = uniquePush(
          answers.transport.groundTransport,
          "private-transfer",
        );
      }
      break;
    case "tourist-trap-queue":
      if (!liked) {
        answers.dealBreakers ??= {};
        answers.dealBreakers.neverAgain = uniquePush(
          answers.dealBreakers.neverAgain,
          "tourist-trap queues",
        );
        answers.sensory ??= {};
        answers.sensory.crowdTolerance = Math.min(
          answers.sensory.crowdTolerance ?? 3,
          2,
        ) as 2;
      }
      break;
    case "early-alarm":
      if (!liked) {
        answers.dealBreakers ??= {};
        answers.dealBreakers.biggestRuiner = "early morning starts";
        answers.pace ??= {};
        answers.pace.earlyDepartureTolerance = 1;
      }
      break;
    case "noisy-hostel":
      if (!liked) {
        answers.accommodation ??= {};
        answers.accommodation.dealBreakers = uniquePush(
          answers.accommodation.dealBreakers,
          "noisy-environment",
        );
        answers.sensory ??= {};
        answers.sensory.noiseSensitivity = 5;
      }
      break;
    case "unsafe-feeling-area":
      if (!liked) {
        answers.comfortRisk ??= {};
        answers.comfortRisk.safetyPriority = 5;
      } else {
        answers.comfortRisk ??= {};
        answers.comfortRisk.safetyPriority = 3;
      }
      break;
  }
}

function uniquePush(list: string[] | undefined, value: string): string[] {
  const arr = list ?? [];
  return arr.includes(value) ? arr : [...arr, value];
}

function buildRecapFacts(swipes: SwipeInput[]): string[] {
  const facts: string[] = [];
  for (const swipe of swipes) {
    if (swipe.direction === "left") continue;
    const card = CARD_MAP.get(swipe.cardId);
    if (!card) continue;
    const prefix = swipe.direction === "super" ? "Loves" : "Likes";
    facts.push(`${prefix}: ${card.title.toLowerCase()}`);
  }
  return facts.slice(0, 8);
}

/** Build a short recap message without LLM (fallback). */
export function formatSwipeRecap(facts: string[]): string {
  if (!facts.length) {
    return "Your taste profile is saved. Tell me what city you're in and I'll suggest how to spend your free hours.";
  }
  return (
    `*Your taste, saved.*\n\n` +
    facts.map((f) => `· ${f}`).join("\n") +
    `\n\nWhen you land somewhere new, just tell me — _"I have 3 hours in Barcelona, what should I do?"_ — and I'll plan around you.`
  );
}
