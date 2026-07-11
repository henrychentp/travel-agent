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
      return 2;
    case "full":
      return 5;
    default:
      return 3;
  }
}

/**
 * Run the revision loop over draft ops.
 *
 * TODO(Agent B): also drop venues that are closed at the scheduled time, add
 * geo/time buffers using walkingTolerance + ground transport, and protect
 * dailyDowntime. For now it enforces the density cap only.
 */
export function runRevisionLoop(
  profile: TravellerProfile,
  ops: PatchOp[],
  ctx: RevisionContext,
): RevisionResult {
  const cap = ctx.maxPerDay ?? densityCap(profile);
  const perDay = new Map<string, number>();
  const kept: PatchOp[] = [];
  const dropped: { op: PatchOp; reason: string }[] = [];

  for (const op of ops) {
    if (op.op !== "add") {
      kept.push(op);
      continue;
    }
    const n = perDay.get(op.date) ?? 0;
    if (n >= cap) {
      dropped.push({ op, reason: `exceeds daily activity density (${cap}/day)` });
      continue;
    }
    perDay.set(op.date, n + 1);
    kept.push(op);
  }

  return { ops: kept, dropped, issues: [] };
}
