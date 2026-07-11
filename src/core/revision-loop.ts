/**
 * Dynamic Revision Loop (Agent B core).
 *
 * Takes a set of draft patch ops and filters them down to a feasible set:
 * drops closures / bad vectors and enforces the traveller's daily activity
 * density. Pure and synchronous so it is trivial to unit-test.
 */

import type { PatchOp, TravellerProfile } from "../shared/schemas.js";

export interface RevisionContext {
  now: string;
  /** Override the per-day activity cap (else derived from the profile). */
  maxPerDay?: number;
  /** Planning window; candidates outside it can never be scheduled. */
  tripStart?: string;
  tripEnd?: string;
}

export interface RevisionResult {
  ops: PatchOp[];
  dropped: { op: PatchOp; reason: string }[];
  issues: string[];
}

/** Per-day activity cap derived from the traveller's preferred pace. */
export function densityCap(profile: TravellerProfile): number {
  switch (profile.pace.dailyActivityDensity) {
    case "light":
      return profile.pace.dailyDowntime?.required ? 1 : 2;
    case "full":
      return profile.pace.dailyDowntime?.required ? 4 : 5;
    default:
      return profile.pace.dailyDowntime?.required ? 2 : 3;
  }
}

/**
 * Run the revision loop over draft ops.
 *
 * This is deliberately conservative until a maps/availability provider is
 * connected: it rejects out-of-window and duplicate candidates, protects
 * requested downtime through a lower activity cap, and limits low-walking
 * travellers to one distinct activity location per day. Opening hours and
 * travel-time matrices remain provider-backed work, not guessed facts.
 */
export function runRevisionLoop(
  profile: TravellerProfile,
  ops: PatchOp[],
  ctx: RevisionContext,
): RevisionResult {
  const cap = ctx.maxPerDay ?? densityCap(profile);
  const perDay = new Map<string, number>();
  const titles = new Set<string>();
  const locations = new Map<string, Set<string>>();
  const kept: PatchOp[] = [];
  const dropped: { op: PatchOp; reason: string }[] = [];

  for (const op of ops) {
    if (op.op !== "add") {
      kept.push(op);
      continue;
    }
    if (ctx.tripStart && op.date < ctx.tripStart || ctx.tripEnd && op.date > ctx.tripEnd) {
      dropped.push({ op, reason: "outside the trip date window" });
      continue;
    }
    if (!op.after || op.after.kind !== "activity") {
      kept.push(op);
      continue;
    }
    const titleKey = `${op.date}:${op.after.title.trim().toLowerCase()}`;
    if (titles.has(titleKey)) {
      dropped.push({ op, reason: "duplicate activity candidate" });
      continue;
    }
    const dayLocations = locations.get(op.date) ?? new Set<string>();
    const location = op.after.location?.trim().toLowerCase();
    if (
      profile.pace.walkingTolerance === "low" &&
      location &&
      dayLocations.size > 0 &&
      !dayLocations.has(location)
    ) {
      dropped.push({ op, reason: "low walking tolerance allows one activity area per day" });
      continue;
    }
    const n = perDay.get(op.date) ?? 0;
    if (n >= cap) {
      dropped.push({ op, reason: `exceeds daily activity density (${cap}/day)` });
      continue;
    }
    perDay.set(op.date, n + 1);
    titles.add(titleKey);
    if (location) dayLocations.add(location);
    locations.set(op.date, dayLocations);
    kept.push(op);
  }

  return { ops: kept, dropped, issues: [] };
}
