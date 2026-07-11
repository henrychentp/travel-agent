import type { ProfileCategory } from "../../shared/schemas.js";

export interface OnboardingQuestion {
  category: ProfileCategory;
  /** Natural-language question to ask the traveller. */
  prompt: string;
  /** Fields this question is meant to fill (for progress tracking). */
  fields: string[];
  priority: "must-have" | "nice-to-have";
}

/**
 * Elicitation questions mapped to the taste-profile checklist.
 * Ordered for a natural conversation arc: identity → motivations → logistics taste.
 */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    category: "identity",
    prompt:
      "To start — what city do you usually travel from, and which airports are convenient for you?",
    fields: ["homeCity", "departureAirports", "citizenships"],
    priority: "must-have",
  },
  {
    category: "motivations",
    prompt:
      "What are the main reasons you travel for leisure — and after a truly great trip, how do you want to feel?",
    fields: ["primary", "desiredEmotion", "explorationVsReturn"],
    priority: "must-have",
  },
  {
    category: "pace",
    prompt:
      "How do you like your days structured — a few planned highlights, or a packed schedule? And how much walking feels good?",
    fields: [
      "dailyActivityDensity",
      "structureVsSpontaneity",
      "walkingTolerance",
      "earlyDepartureTolerance",
    ],
    priority: "must-have",
  },
  {
    category: "accommodation",
    prompt:
      "Describe your ideal place to stay in three words — and anything that would make you refuse a hotel outright.",
    fields: ["types", "vibe", "amenityMustHaves", "dealBreakers"],
    priority: "must-have",
  },
  {
    category: "transport",
    prompt:
      "For flights: preferred cabin, aisle or window, and any airline loyalties? Any mobility needs we should know?",
    fields: [
      "cabinLongHaul",
      "seat",
      "airlineLoyalties",
      "departureWindows",
      "transitNeeds",
    ],
    priority: "must-have",
  },
  {
    category: "food",
    prompt:
      "Any dietary rules or allergies? Which cuisines do you love, and how adventurous are you with food when traveling?",
    fields: [
      "cuisineLoves",
      "cuisineAvoids",
      "adventurousness",
      "dealBreakers",
    ],
    priority: "must-have",
  },
  {
    category: "activities",
    prompt:
      "What kinds of activities do you usually enjoy on trips — and how physically active should they be?",
    fields: ["categories", "physicalLevel", "nicheInterests", "nightlife"],
    priority: "must-have",
  },
  {
    category: "budget",
    prompt:
      "For a typical leisure trip, what total budget feels comfortable — and where do you prefer to splurge vs save?",
    fields: ["typicalRange", "splurgeCategories", "saveCategories"],
    priority: "must-have",
  },
  {
    category: "comfortRisk",
    prompt:
      "How do you balance comfort vs novelty? And how much travel friction are you willing to tolerate for something special?",
    fields: [
      "safetyPriority",
      "comfortVsNovelty",
      "frictionTolerance",
      "offBeatenPath",
    ],
    priority: "must-have",
  },
  {
    category: "sensory",
    prompt:
      "What climates do you enjoy? And how do you handle crowds and noise when sleeping?",
    fields: ["climates", "crowdTolerance", "noiseSensitivity", "heatTolerance"],
    priority: "must-have",
  },
  {
    category: "constraints",
    prompt:
      "Any hard constraints we must respect — medical, mobility, religious, visa exclusions, or dates you absolutely cannot travel?",
    fields: [
      "medicalConditions",
      "mobilityLimitations",
      "religiousObservances",
      "dietaryRestrictions",
      "legalVisaExclusions",
      "blackoutDates",
    ],
    priority: "must-have",
  },
  {
    category: "communication",
    prompt:
      "How should we reach you with updates — and do you prefer detailed itineraries or high-level summaries?",
    fields: ["channels", "detailVsSummary", "optionCount", "approvalThresholds"],
    priority: "must-have",
  },
  {
    category: "dealBreakers",
    prompt:
      "Tell me about a favorite trip and why it was great — and the single biggest thing that would ruin a trip for you.",
    fields: ["favoriteTrips", "biggestRuiner", "neverAgain", "regrets"],
    priority: "must-have",
  },
  {
    category: "social",
    prompt: "Who do you usually travel with, and are you the one making the final decisions?",
    fields: ["companions", "children", "decisionRole"],
    priority: "nice-to-have",
  },
  {
    category: "brandLoyalty",
    prompt:
      "Any hotel brands or loyalty programs you want us to factor in? How important is sustainability?",
    fields: ["hotelBrands", "programs", "sustainabilityImportance"],
    priority: "nice-to-have",
  },
];

export function nextQuestion(
  filledCategories: Set<ProfileCategory>,
  requiredOnly = true,
): OnboardingQuestion | null {
  for (const q of ONBOARDING_QUESTIONS) {
    if (filledCategories.has(q.category)) continue;
    if (requiredOnly && q.priority === "nice-to-have") continue;
    return q;
  }
  if (requiredOnly) return nextQuestion(filledCategories, false);
  return null;
}
