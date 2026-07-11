/**
 * The Director (Manager Agent).
 *
 * The single backbone shared by the whole-trip planner and the in-trip
 * concierge. It deconstructs the current context into a plan, orchestrates the
 * three workers (Scout -> Logistics revision loop -> Culture), gates on hard
 * constraints, and emits a TripPatch.
 *
 *   plan(profile, state, intent) -> TripPatch
 *
 * A full trip plan is a patch from an empty itinerary; a live need is a patch
 * over an existing one. Same operation, different scope.
 */

import { checkHardConstraints, ConstraintViolation } from "./constraints.js";
import { createScout, type Scout, type ScoutContext } from "./workers/scout.js";
import { createLogistics, type Logistics } from "./workers/logistics.js";
import { createCulture, type Culture } from "./workers/culture.js";
import { createLiveTools, type LiveTools } from "../tools/index.js";
import type {
  Booking,
  Cabin,
  ISODate,
  LiveNeedRequest,
  PatchOp,
  TravellerProfile,
  TripId,
  TripPatch,
  TripRequest,
  TripState,
  UserId,
} from "../shared/schemas.js";

/** What the Director is being asked to do — the only planner/concierge fork. */
export type Intent =
  | { kind: "full-plan"; tripId: TripId; userId: UserId; request: TripRequest }
  | {
      kind: "live-need";
      tripId: TripId;
      userId: UserId;
      need: LiveNeedRequest;
    };

export interface DirectorDeps {
  scout: Scout;
  logistics: Logistics;
  culture: Culture;
  tools: LiveTools;
  now: () => string;
}

/** Preferred flight cabin, derived from the profile + trip length. */
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
    (longTrip
      ? profile.transport.cabinLongHaul
      : profile.transport.cabinShortHaul) ??
    profile.transport.cabinShortHaul ??
    "economy"
  );
}

function bookingDate(b: Booking, fallback: ISODate): ISODate {
  if (b.kind === "flight") return b.depart;
  if (b.kind === "hotel") return b.checkIn;
  return b.date || fallback;
}

/** Resolve the request + search window for either intent. */
function deconstruct(
  intent: Intent,
  state: TripState | null,
): { request: TripRequest; start: ISODate; end: ISODate; ctx: ScoutContext } {
  if (intent.kind === "full-plan") {
    const r = intent.request;
    return {
      request: r,
      start: r.startDate,
      end: r.endDate,
      ctx: { destination: r.destination, start: r.startDate, end: r.endDate },
    };
  }
  if (!state) {
    throw new Error(`live-need requires existing trip state for ${intent.tripId}`);
  }
  const r = state.current.request;
  const start = intent.need.at ?? r.startDate;
  return {
    request: r,
    start,
    end: r.endDate,
    ctx: {
      destination: r.destination,
      start,
      end: r.endDate,
      location: intent.need.location,
      focus: intent.need.text,
    },
  };
}

/**
 * Decide whether a live change is large enough to need explicit human sign-off.
 * TODO(Director): parse profile.communication.approvalThresholds into rules.
 */
function decideApproval(
  profile: TravellerProfile | null,
  ops: PatchOp[],
): boolean {
  void profile;
  return ops.length > 2;
}

export class Director {
  private scout: Scout;
  private logistics: Logistics;
  private culture: Culture;
  private tools: LiveTools;
  private now: () => string;

  constructor(deps?: Partial<DirectorDeps>) {
    this.scout = deps?.scout ?? createScout();
    this.logistics = deps?.logistics ?? createLogistics();
    this.culture = deps?.culture ?? createCulture();
    this.tools = deps?.tools ?? createLiveTools();
    this.now = deps?.now ?? (() => new Date().toISOString());
  }

  async plan(
    profile: TravellerProfile | null,
    state: TripState | null,
    intent: Intent,
  ): Promise<TripPatch> {
    const now = this.now();
    const { request, start, ctx } = deconstruct(intent, state);

    // Hard-constraint gate — reject infeasible requests outright.
    if (profile) {
      const issues = checkHardConstraints(profile, request);
      if (issues.length > 0) throw new ConstraintViolation(issues);
    }

    // Agent A · Scout — candidate options from live web layers.
    let findings = profile
      ? await this.scout.find(profile, ctx, this.tools)
      : { options: [] as Booking[], sentiment: {} as Record<string, number> };

    // QA/error loop: a real Scout can return an empty set for an over-specific
    // query. Retry once with an explicit broadening instruction before asking
    // Culture to explain an empty plan.
    if (profile && findings.options.length === 0) {
      findings = await this.scout.find(profile, {
        ...ctx,
        focus: [ctx.focus, "Broaden the search to currently open, practical options."].filter(Boolean).join(" "),
      }, this.tools);
    }

    let ops: PatchOp[] = findings.options.map((option) => ({
      op: "add" as const,
      date: bookingDate(option, start),
      after: option,
      reason: "scout candidate",
    }));

    // Agent B · Logistics — dynamic revision loop (feasibility, density).
    if (profile) {
      const revised = await this.logistics.revise(profile, ops, {
        now,
        tripStart: request.startDate,
        tripEnd: request.endDate,
      });
      ops = revised.ops;
    }

    // Agent C · Culture — synthesize an elegant brief / rationale.
    const brief = profile
      ? await this.culture.curate(profile, ops)
      : { summary: "", highlights: [] as string[] };

    return {
      tripId: intent.tripId,
      userId: intent.userId,
      ops,
      requiresApproval:
        intent.kind === "live-need" ? decideApproval(profile, ops) : false,
      rationale:
        brief.summary ||
        (intent.kind === "full-plan"
          ? `Initial plan for ${request.destination}.`
          : `Response to live need: "${intent.need.text}".`),
      proposedAt: now,
    };
  }
}
