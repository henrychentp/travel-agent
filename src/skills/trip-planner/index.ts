/**
 * Skill 2 · Whole-Trip Planner  (Person 2)
 *
 * Books flights, hotels, activities and builds a feasible itinerary that
 * respects the traveller's remembered taste (from Mem0). Writes the resulting
 * plan to Trip State.
 *
 *   planTrip(userId, request) -> TripPlan
 *
 * The planner treats the TravellerProfile per the checklist's principle:
 * HARD CONSTRAINTS gate feasibility (reject), SOFT PREFERENCES rank options.
 */

import type { Mem0Client } from "../../shared/mem0-client.js";
import type { TripStore } from "../../shared/trip-store.js";
import type { LiveTools } from "../../tools/index.js";
import type {
  Cabin,
  TravellerProfile,
  TripPlan,
  TripRequest,
  UserId,
} from "../../shared/schemas.js";

export interface PlannerDeps {
  mem0: Mem0Client;
  trips: TripStore;
  tools: LiveTools;
  now?: () => string;
  newTripId?: (userId: UserId) => string;
}

/** Raised when a request violates a hard constraint (infeasible, not just poor). */
export class ConstraintViolation extends Error {
  constructor(public issues: string[]) {
    super(`Trip violates hard constraints: ${issues.join("; ")}`);
    this.name = "ConstraintViolation";
  }
}

/**
 * Check a request against the traveller's HARD constraints. Returns the list of
 * violations (empty === feasible). Never down-ranks — these are gates.
 */
export function checkHardConstraints(
  profile: TravellerProfile,
  request: TripRequest,
): string[] {
  const issues: string[] = [];
  const dest = request.destination.toLowerCase();

  for (const excluded of profile.constraints.legalVisaExclusions ?? []) {
    if (dest.includes(excluded.toLowerCase())) {
      issues.push(`Destination "${request.destination}" excluded (visa/legal): ${excluded}`);
    }
  }

  for (const window of profile.constraints.blackoutDates ?? []) {
    const overlaps =
      request.startDate <= window.end && request.endDate >= window.start;
    if (overlaps) {
      issues.push(`Dates overlap a blackout window (${window.start}..${window.end})`);
    }
  }

  return issues;
}

/**
 * Preferred flight cabin for this trip, derived from the profile + trip length.
 * Long trips (>=6h implied by multi-day international) lean on the long-haul
 * preference; otherwise short-haul.
 */
export function preferredCabin(
  profile: TravellerProfile,
  request: TripRequest,
): Cabin {
  const nights =
    (new Date(request.endDate).getTime() -
      new Date(request.startDate).getTime()) /
    86_400_000;
  const longTrip = nights >= 5;
  return (
    (longTrip ? profile.transport.cabinLongHaul : profile.transport.cabinShortHaul) ??
    profile.transport.cabinShortHaul ??
    "economy"
  );
}

/**
 * Build a complete, feasible trip and persist v1 to Trip State.
 *
 * TODO(Person 2): call the live tools for real flight/hotel/activity options,
 * rank them using the soft-preference signals below (safetyPriority,
 * comfortVsNovelty, dailyActivityDensity, walkingTolerance, cuisineLoves,
 * splurge/save categories, ...), and assemble a time- and budget-feasible plan.
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

  if (profile) {
    const issues = checkHardConstraints(profile, request);
    if (issues.length > 0) throw new ConstraintViolation(issues);
    // Soft preferences below drive ranking once real options are fetched.
    void preferredCabin(profile, request);
  }

  // TODO: replace with real tool calls + itinerary assembly ranked by taste.
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
