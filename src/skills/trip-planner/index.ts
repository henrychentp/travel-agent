/**
 * Skill 2 · Whole-Trip Planner  (Person 2)
 *
 * Thin adapter over the Director. A full plan is just a TripPatch applied to an
 * empty itinerary; the Director does the real work (scout -> revise -> curate,
 * gated by hard constraints).
 *
 *   planTrip(userId, request) -> TripPlan
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import type { TripStore } from "../../shared/trip-store.js";
import type { Director } from "../../core/director.js";
import { applyPatch, seedEmptyPlan } from "../../core/apply-patch.js";
import type { TripPlan, TripRequest, UserId } from "../../shared/schemas.js";

export interface PlannerDeps {
  mem0: Mem0Client;
  trips: TripStore;
  director: Director;
  now?: () => string;
  newTripId?: (userId: UserId) => string;
}

export async function planTrip(
  userId: UserId,
  request: TripRequest,
  deps: PlannerDeps,
): Promise<TripPlan> {
  const now = deps.now ?? (() => new Date().toISOString());
  const tripId = deps.newTripId?.(userId) ?? `${userId}-${request.destination}`;

  const profile = await deps.mem0.getProfile(userId);
  const patch = await deps.director.plan(profile, null, {
    kind: "full-plan",
    tripId,
    userId,
    request,
  });

  // Full plan = first patch applied to an empty seed -> version 1.
  const plan = applyPatch(seedEmptyPlan(tripId, userId, request, now()), patch, now());
  await deps.trips.create(plan);
  return plan;
}
