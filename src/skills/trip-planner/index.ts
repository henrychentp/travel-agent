/**
 * Skill 2 · Whole-Trip Planner  (Person 2)
 *
 * Books flights, hotels, activities and builds a feasible itinerary that
 * respects the traveller's remembered taste (from Mem0). Writes the resulting
 * plan to Trip State.
 *
 *   planTrip(userId, request) -> TripPlan
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import type { TripStore } from "../../shared/trip-store.js";
import type {
  TripPlan,
  TripRequest,
  UserId,
} from "../../shared/schemas.js";
import type { LiveTools } from "../../tools/index.js";

export interface PlannerDeps {
  mem0: Mem0Client;
  trips: TripStore;
  tools: LiveTools;
  now?: () => string;
  /** Injectable id generator so tests are deterministic. */
  newTripId?: (userId: UserId) => string;
}

/**
 * Build a complete, feasible trip and persist v1 to Trip State.
 *
 * TODO(Person 2): call the live tools (flights/hotels/maps) for real options,
 * filter/rank them by the TravellerProfile, and assemble a day-by-day plan
 * that is time- and budget-feasible.
 */
export async function planTrip(
  userId: UserId,
  request: TripRequest,
  deps: PlannerDeps,
): Promise<TripPlan> {
  const now = deps.now ?? (() => new Date().toISOString());
  const tripId =
    deps.newTripId?.(userId) ?? `${userId}-${request.destination}`;

  const profile = await deps.mem0.getProfile(userId);
  void profile; // TODO: use taste to rank options

  // TODO: replace with real tool calls + itinerary assembly.
  const plan: TripPlan = {
    tripId,
    userId,
    request,
    itinerary: [],
    version: 1,
    createdAt: now(),
  };

  await deps.trips.create(plan);
  return plan;
}
