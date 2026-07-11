/**
 * Hermes — the Manager / orchestrator.
 *
 * Routes traveller intent and coordinates the three specialist skills over a
 * single shared traveller memory (Mem0) and live trip state (Trip Store).
 * Owns the wiring so skills never construct their own dependencies.
 */

import { createMem0Client, type Mem0Client } from "../shared/mem0-client.js";
import { createTripStore, type TripStore } from "../shared/trip-store.js";
import { createLiveTools, type LiveTools } from "../tools/index.js";

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
  now?: () => string;
}

export class Hermes {
  private mem0: Mem0Client;
  private trips: TripStore;
  private tools: LiveTools;
  private now: () => string;

  constructor(deps?: Partial<HermesDeps>) {
    this.mem0 = deps?.mem0 ?? createMem0Client();
    this.trips = deps?.trips ?? createTripStore();
    this.tools = deps?.tools ?? createLiveTools();
    this.now = deps?.now ?? (() => new Date().toISOString());
  }

  /** Route: onboard a traveller and learn their durable taste. */
  onboard(userId: UserId, answers: OnboardingAnswers): Promise<TravellerProfile> {
    return onboardUser(userId, answers, { mem0: this.mem0, now: this.now });
  }

  /** Route: plan a whole trip using remembered taste. */
  plan(userId: UserId, request: TripRequest): Promise<TripPlan> {
    return planTrip(userId, request, {
      mem0: this.mem0,
      trips: this.trips,
      tools: this.tools,
      now: this.now,
    });
  }

  /**
   * Route: handle a spontaneous in-trip need. Returns a proposed patch; the
   * caller commits it once approved (auto or human).
   */
  liveNeed(
    userId: UserId,
    tripId: TripId,
    request: LiveNeedRequest,
  ): Promise<TripPatch> {
    return handleLiveNeed(userId, tripId, request, {
      mem0: this.mem0,
      trips: this.trips,
      tools: this.tools,
      now: this.now,
    });
  }

  /**
   * Apply an approved patch to Trip State as a new version.
   * TODO: enforce the human-approval gate for patches where
   * `requiresApproval` is true.
   */
  async applyPatch(patch: TripPatch): Promise<TripPlan> {
    const state = await this.trips.get(patch.tripId);
    if (!state) throw new Error(`Unknown tripId: ${patch.tripId}`);
    // TODO: translate patch.ops into itinerary mutations.
    const next: TripPlan = {
      ...state.current,
      version: state.current.version + 1,
      createdAt: this.now(),
    };
    await this.trips.commit(next);
    return next;
  }
}
