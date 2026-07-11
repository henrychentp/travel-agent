/**
 * The single unit of change: a TripPatch applied to a TripPlan.
 *
 * A full plan and a live-need edit both reduce to "apply a TripPatch". A fresh
 * plan starts from an empty seed (version 0); applying the first patch yields
 * version 1. Every subsequent patch bumps the version.
 */

import type {
  Booking,
  ISODate,
  ItineraryDay,
  TripId,
  TripPatch,
  TripPlan,
  TripRequest,
  UserId,
} from "../shared/schemas.js";

/** An empty version-0 plan to apply the first patch onto. */
export function seedEmptyPlan(
  tripId: TripId,
  userId: UserId,
  request: TripRequest,
  at: ISODate,
): TripPlan {
  return { tripId, userId, request, itinerary: [], version: 0, createdAt: at };
}

function sameBooking(a: Booking, b: Booking): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Apply a patch to a plan, returning the next version. Pure — does not mutate
 * the input plan.
 */
export function applyPatch(
  current: TripPlan,
  patch: TripPatch,
  at: ISODate,
): TripPlan {
  const days = new Map<ISODate, Booking[]>();
  for (const day of current.itinerary) days.set(day.date, [...day.items]);

  for (const op of patch.ops) {
    const items = days.get(op.date) ?? [];
    if (op.op === "add" && op.after) {
      items.push(op.after);
    } else if (op.op === "remove" && op.before) {
      const i = items.findIndex((b) => sameBooking(b, op.before!));
      if (i >= 0) items.splice(i, 1);
    } else if (op.op === "replace" && op.after) {
      const i = op.before
        ? items.findIndex((b) => sameBooking(b, op.before!))
        : -1;
      if (i >= 0) items[i] = op.after;
      else items.push(op.after);
    }
    days.set(op.date, items);
  }

  const itinerary: ItineraryDay[] = [...days.entries()]
    .filter(([, items]) => items.length > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, items]) => ({ date, items }));

  return {
    ...current,
    itinerary,
    version: current.version + 1,
    createdAt: at,
  };
}
