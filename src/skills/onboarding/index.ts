/**
 * Skill 1 · Onboarding & Memory  (Person 1)
 *
 * Learns taste and constraints from the traveller, then writes durable
 * preferences to Mem0. Populates the TravellerProfile defined by
 * docs/traveller-taste-profile-checklist.md.
 *
 *   onboardUser(userId, answers) -> TravellerProfile
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import {
  emptyProfile,
  PROFILE_CATEGORIES,
  type OnboardingAnswers,
  type ProfileCategory,
  type TravellerProfile,
  type UserId,
} from "../../shared/schemas.js";

export interface OnboardingDeps {
  mem0: Mem0Client;
  /** Deterministic clock, injectable for tests. */
  now?: () => string;
}

/**
 * Merge onboarding answers into the durable profile and persist it.
 *
 * - Each provided category is shallow-merged over any existing values.
 * - Provided categories are marked as `stated` (confidence 1.0) and stamped
 *   with a last-confirmed timestamp, so the planner can tell explicit answers
 *   from inferred ones.
 *
 * TODO(Person 1): use an LLM to turn free-text answers into structured tags,
 * and to reconcile conflicting answers rather than letting the newest win.
 */
export async function onboardUser(
  userId: UserId,
  answers: OnboardingAnswers,
  deps: OnboardingDeps,
): Promise<TravellerProfile> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stampedAt = now();

  const existing = await deps.mem0.getProfile(userId);
  const profile = existing ?? emptyProfile(userId, stampedAt);

  // Shallow-merge each provided category over the current profile.
  for (const category of PROFILE_CATEGORIES) {
    const incoming = answers[category];
    if (!incoming) continue;
    profile[category] = { ...profile[category], ...incoming } as never;
    profile.confidence[category] = 1;
    profile.lastConfirmed[category] = stampedAt;
  }

  if (answers.notes?.length) {
    profile.notes.push(...answers.notes);
  }

  profile.updatedAt = stampedAt;

  await deps.mem0.saveProfile(profile);
  return profile;
}

/**
 * Which minimum-viable categories are still empty for a user — drives the
 * onboarding questions worth asking next.
 */
export function missingCategories(
  profile: TravellerProfile,
  required: ProfileCategory[],
): ProfileCategory[] {
  return required.filter((c) => Object.keys(profile[c]).length === 0);
}
