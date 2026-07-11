/**
 * Skill 3 · In-Trip Concierge  (Person 3)
 *
 * Handles spontaneous needs during a live trip and proposes safe changes,
 * replanning using the traveller's remembered taste. Major changes require
 * human approval before they are committed to Trip State.
 *
 *   handleLiveNeed(userId, tripId, request) -> TripPatch
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import type { TripStore } from "../../shared/trip-store.js";
import type { LiveTools } from "../../tools/index.js";
import type {
  LiveNeedRequest,
  TripId,
  TripPatch,
  UserId,
} from "../../shared/schemas.js";

export interface ConciergeDeps {
  mem0: Mem0Client;
  trips: TripStore;
  tools: LiveTools;
  now?: () => string;
}

/**
 * Interpret a live need, propose a minimal safe patch to the itinerary, and
 * flag whether it needs human sign-off. Does NOT commit — the orchestrator
 * commits to Trip State once (auto- or human-) approved.
 *
 * TODO(Person 3): use an LLM + live tools to generate concrete patch ops that
 * honour the TravellerProfile, and implement the requiresApproval policy.
 */
export async function handleLiveNeed(
  userId: UserId,
  tripId: TripId,
  request: LiveNeedRequest,
  deps: ConciergeDeps,
): Promise<TripPatch> {
  const now = deps.now ?? (() => new Date().toISOString());

  const state = await deps.trips.get(tripId);
  if (!state) throw new Error(`Unknown tripId: ${tripId}`);

  const profile = await deps.mem0.getProfile(userId);
  void profile; // TODO: replan using remembered taste

  // TODO: derive real patch ops from the live need + tools.
  const patch: TripPatch = {
    tripId,
    userId,
    ops: [],
    requiresApproval: false,
    rationale: `Stub response to live need: "${request.text}"`,
    proposedAt: now(),
  };

  return patch;
}
