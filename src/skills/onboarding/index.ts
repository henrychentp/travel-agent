/**
 * Skill 1 · Onboarding & Memory  (Person 1)
 *
 * Learns taste and constraints from the traveller, then writes durable
 * preferences to Mem0.
 *
 *   onboardUser(userId, answers) -> TravellerProfile
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import type {
  OnboardingAnswers,
  TravellerProfile,
  UserId,
} from "../../shared/schemas.js";

export interface OnboardingDeps {
  mem0: Mem0Client;
  /** Deterministic clock, injectable for tests. */
  now?: () => string;
}

/**
 * Turn raw onboarding answers into a durable TravellerProfile and persist it.
 *
 * TODO(Person 1): use an LLM to enrich free-text answers into structured taste,
 * and to reconcile with any existing profile instead of overwriting.
 */
export async function onboardUser(
  userId: UserId,
  answers: OnboardingAnswers,
  deps: OnboardingDeps,
): Promise<TravellerProfile> {
  const now = deps.now ?? (() => new Date().toISOString());

  const existing = await deps.mem0.getProfile(userId);

  const profile: TravellerProfile = {
    userId,
    homeCity: answers.homeCity ?? existing?.homeCity,
    budgetTier: answers.budgetTier ?? existing?.budgetTier ?? "comfort",
    pace: answers.pace ?? existing?.pace ?? "balanced",
    interests: answers.interests ?? existing?.interests ?? [],
    dietary: answers.dietary ?? existing?.dietary ?? [],
    mobility: answers.mobility ?? existing?.mobility ?? [],
    seatPreference:
      answers.seatPreference ?? existing?.seatPreference ?? "no-preference",
    notes: existing?.notes ?? [],
    updatedAt: now(),
  };

  if (answers.freeText) profile.notes.push(answers.freeText);

  await deps.mem0.saveProfile(profile);
  return profile;
}
