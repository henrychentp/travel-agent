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
import { chat, type ChatMessage } from "../shared/llm.js";
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
  intake: DirectorIntake;
  now: () => string;
}

/** The LLM-generated brief the Director shares with all three specialists. */
export interface DirectorBrief {
  priorities: string[];
  scoutFocus: string;
  logisticsRules: string[];
  cultureIntent: string;
  missingInfo: string[];
}

export interface DirectorIntake {
  collect(
    profile: TravellerProfile | null,
    request: TripRequest,
    intent: Intent,
  ): Promise<DirectorBrief>;
}

type Chat = (messages: ChatMessage[]) => Promise<string>;

function deterministicBrief(
  profile: TravellerProfile | null,
  request: TripRequest,
  intent: Intent,
): DirectorBrief {
  const priorities = [
    ...(request.mustHaves ?? []),
    ...(profile?.motivations.primary ?? []),
    ...(profile?.activities.categories ?? []),
  ].filter(Boolean).slice(0, 6);
  const liveNeed = intent.kind === "live-need" ? intent.need.text : "";
  return {
    priorities,
    scoutFocus: [
      liveNeed,
      priorities.length ? `Priorities: ${priorities.join(", ")}.` : "",
      profile?.food.cuisineLoves?.length ? `Food: ${profile.food.cuisineLoves.join(", ")}.` : "",
    ].filter(Boolean).join(" "),
    logisticsRules: [
      profile?.pace.dailyActivityDensity ? `${profile.pace.dailyActivityDensity} daily pace` : "",
      profile?.pace.dailyDowntime?.required ? `protect ${profile.pace.dailyDowntime.minutes ?? 60} minutes downtime` : "",
      request.dayWindow ? `only schedule ${request.dayWindow.startAt} to ${request.dayWindow.endAt}` : "",
    ].filter(Boolean),
    cultureIntent: priorities.join(", ") || "a balanced local experience",
    missingInfo: [],
  };
}

function parseBrief(raw: string, fallback: DirectorBrief): DirectorBrief {
  try {
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as Partial<DirectorBrief>;
    return {
      priorities: Array.isArray(json.priorities) ? json.priorities.filter((value): value is string => typeof value === "string").slice(0, 6) : fallback.priorities,
      scoutFocus: typeof json.scoutFocus === "string" ? json.scoutFocus : fallback.scoutFocus,
      logisticsRules: Array.isArray(json.logisticsRules) ? json.logisticsRules.filter((value): value is string => typeof value === "string").slice(0, 6) : fallback.logisticsRules,
      cultureIntent: typeof json.cultureIntent === "string" ? json.cultureIntent : fallback.cultureIntent,
      missingInfo: Array.isArray(json.missingInfo) ? json.missingInfo.filter((value): value is string => typeof value === "string").slice(0, 3) : [],
    };
  } catch {
    return fallback;
  }
}

/** LLM intake: turns memory + request text into a bounded, structured brief. */
export class OpenAIDirectorIntake implements DirectorIntake {
  constructor(private readonly chatFn: Chat = chat) {}

  async collect(profile: TravellerProfile | null, request: TripRequest, intent: Intent): Promise<DirectorBrief> {
    const fallback = deterministicBrief(profile, request, intent);
    try {
      const raw = await this.chatFn([
        {
          role: "system",
          content: "You are the Hermes Director. Convert traveller context into a concise planning brief for Scout, Logistics, and Culture. Preserve destination, dates, confirmed bookings, hard constraints, and requested window. Never invent availability, bookings, prices, or facts. Return JSON only with priorities, scoutFocus, logisticsRules, cultureIntent, and missingInfo.",
        },
        {
          role: "user",
          content: JSON.stringify({
            request,
            liveNeed: intent.kind === "live-need" ? intent.need.text : undefined,
            profile: profile ? {
              destinationCity: profile.destinationCity,
              motivations: profile.motivations.primary,
              pace: profile.pace,
              food: profile.food,
              activities: profile.activities,
              budget: profile.budget,
              constraints: profile.constraints,
              notes: profile.notes.slice(-8),
            } : null,
          }),
        },
      ]);
      return parseBrief(raw, fallback);
    } catch {
      // An unavailable LLM must never prevent deterministic constraint planning.
      return fallback;
    }
  }
}

export class DeterministicDirectorIntake implements DirectorIntake {
  async collect(profile: TravellerProfile | null, request: TripRequest, intent: Intent): Promise<DirectorBrief> {
    return deterministicBrief(profile, request, intent);
  }
}

export function createDirectorIntake(): DirectorIntake {
  return process.env.OPENAI_API_KEY ? new OpenAIDirectorIntake() : new DeterministicDirectorIntake();
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
  private intake: DirectorIntake;
  private now: () => string;

  constructor(deps?: Partial<DirectorDeps>) {
    this.scout = deps?.scout ?? createScout();
    this.logistics = deps?.logistics ?? createLogistics();
    this.culture = deps?.culture ?? createCulture();
    this.tools = deps?.tools ?? createLiveTools();
    this.intake = deps?.intake ?? createDirectorIntake();
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

    // Director intake is the shared brain: use the LLM to extract a bounded
    // brief before delegating to any worker.  It never changes protected facts.
    const intakeBrief = await this.intake.collect(profile, request, intent);
    const scoutContext: ScoutContext = {
      ...ctx,
      focus: [intakeBrief.scoutFocus, ctx.focus].filter(Boolean).join(" "),
    };

    // Agent A · Scout — candidate options from live web layers.
    let findings = profile
      ? await this.scout.find(profile, scoutContext, this.tools)
      : { options: [] as Booking[], sentiment: {} as Record<string, number> };

    // QA/error loop: a real Scout can return an empty set for an over-specific
    // query. Retry once with an explicit broadening instruction before asking
    // Culture to explain an empty plan.
    if (profile && findings.options.length === 0) {
      findings = await this.scout.find(profile, {
        ...scoutContext,
        focus: [intakeBrief.scoutFocus, ctx.focus, "Broaden the search to currently open, practical options."].filter(Boolean).join(" "),
      }, this.tools);
    }

    const protectedAnchors: PatchOp[] = (request.confirmedBookings ?? []).map((booking) => ({
      op: "add" as const,
      date: bookingDate(booking, start),
      after: booking,
      reason: "protected confirmed anchor",
    }));
    let ops: PatchOp[] = [
      ...protectedAnchors,
      ...findings.options.map((option) => ({
      op: "add" as const,
      date: bookingDate(option, start),
      after: option,
      reason: "scout candidate",
      })),
    ];

    // Agent B · Logistics — dynamic revision loop (feasibility, density).
    if (profile) {
      const revised = await this.logistics.revise(profile, ops, {
        now,
        tripStart: request.startDate,
        tripEnd: request.endDate,
        windowStart: request.dayWindow?.startAt,
        windowEnd: request.dayWindow?.endAt,
      }, intakeBrief.logisticsRules);
      ops = revised.ops;
    }

    // Agent C · Culture — synthesize an elegant brief / rationale.
    const brief = profile
      ? await this.culture.curate(profile, ops, intakeBrief.cultureIntent)
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
