/**
 * Skill 3 · In-Trip Concierge  (Person 3)
 *
 * Thin adapter over the Director. A live need is a TripPatch over the existing
 * itinerary. The Director produces the patch (scout -> revise -> curate, gated
 * by hard constraints) and flags whether it needs human approval. The
 * orchestrator commits it to Trip State once approved.
 *
 *   handleLiveNeed(userId, tripId, request) -> TripPatch
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import type { TripStore } from "../../shared/trip-store.js";
import type { Director } from "../../core/director.js";
import type {
  LiveNeedRequest,
  TripId,
  TripPatch,
  UserId,
} from "../../shared/schemas.js";

export interface ConciergeDeps {
  mem0: Mem0Client;
  trips: TripStore;
  director: Director;
}

export async function handleLiveNeed(
  userId: UserId,
  tripId: TripId,
  request: LiveNeedRequest,
  deps: ConciergeDeps,
): Promise<TripPatch> {
  const state = await deps.trips.get(tripId);
  if (!state) throw new Error(`Unknown tripId: ${tripId}`);

  const profile = await deps.mem0.getProfile(userId);
  return deps.director.plan(profile, state, {
    kind: "live-need",
    tripId,
    userId,
    need: request,
  });
}
