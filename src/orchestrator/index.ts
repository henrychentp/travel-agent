/**
 * Hermes — the Manager / orchestrator.
 *
 * Routes traveller intent and coordinates the skills over a single shared
 * traveller memory (Mem0), live trip state (Trip Store), and one planning
 * backbone (the Director). Owns the wiring so skills never build their own deps.
 */

import { createMem0Client, type Mem0Client } from "../shared/mem0-client.js";
import { createTripStore, type TripStore } from "../shared/trip-store.js";
import { createLiveTools, type LiveTools } from "../tools/index.js";
import { Director } from "../core/director.js";
import { applyPatch as applyTripPatch } from "../core/apply-patch.js";

import { onboardUser } from "../skills/onboarding/index.js";
import { planTrip } from "../skills/trip-planner/index.js";
import { handleLiveNeed } from "../skills/concierge/index.js";

import type {
  LiveNeedRequest,
  OnboardingAnswers,
  TripId,
  TripPatch,
  TripPlan,
  TravellerProfile,
  TripRequest,
  UserId,
} from "../shared/schemas.js";

export interface HermesDeps {
  mem0: Mem0Client;
  trips: TripStore;
  tools: LiveTools;
  director: Director;
  now: () => string;
}

export class Hermes {
  private mem0: Mem0Client;
  private trips: TripStore;
  private tools: LiveTools;
  private director: Director;
  private now: () => string;

  constructor(deps?: Partial<HermesDeps>) {
    this.mem0 = deps?.mem0 ?? createMem0Client();
    this.trips = deps?.trips ?? createTripStore();
    this.tools = deps?.tools ?? createLiveTools();
    this.now = deps?.now ?? (() => new Date().toISOString());
    this.director =
      deps?.director ?? new Director({ tools: this.tools, now: this.now });
  }

  /** Route: onboard a traveller and learn their durable taste. */
  onboard(userId: UserId, answers: OnboardingAnswers): Promise<TravellerProfile> {
    return onboardUser(userId, answers, { mem0: this.mem0, now: this.now });
  }

  /** Route: plan a whole trip (a patch from an empty itinerary). */
  plan(userId: UserId, request: TripRequest): Promise<TripPlan> {
    return planTrip(userId, request, {
      mem0: this.mem0,
      trips: this.trips,
      director: this.director,
      now: this.now,
    });
  }

  /** Route: handle a spontaneous in-trip need. Returns a proposed patch. */
  liveNeed(
    userId: UserId,
    tripId: TripId,
    request: LiveNeedRequest,
  ): Promise<TripPatch> {
    return handleLiveNeed(userId, tripId, request, {
      mem0: this.mem0,
      trips: this.trips,
      director: this.director,
    });
  }

  /**
   * Commit an approved patch to Trip State as a new version.
   * TODO: enforce the human-approval gate when `patch.requiresApproval`.
   */
  async applyPatch(patch: TripPatch): Promise<TripPlan> {
    const state = await this.trips.get(patch.tripId);
    if (!state) throw new Error(`Unknown tripId: ${patch.tripId}`);
    const next = applyTripPatch(state.current, patch, this.now());
    await this.trips.commit(next);
    return next;
  }
}
