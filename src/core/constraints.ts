/**
 * Hard-constraint feasibility gate — shared by every plan/patch the Director
 * produces. Hard constraints REJECT (they never down-rank). Soft preferences
 * are handled downstream by the workers + revision loop.
 */

import type { TravellerProfile, TripRequest } from "../shared/schemas.js";

/** Raised when a request violates a hard constraint (infeasible, not just poor). */
export class ConstraintViolation extends Error {
  constructor(public issues: string[]) {
    super(`Trip violates hard constraints: ${issues.join("; ")}`);
    this.name = "ConstraintViolation";
  }
}

/**
 * Return the list of hard-constraint violations for a request (empty === ok).
 */
export function checkHardConstraints(
  profile: TravellerProfile,
  request: TripRequest,
): string[] {
  const issues: string[] = [];
  const dest = request.destination.toLowerCase();

  for (const excluded of profile.constraints.legalVisaExclusions ?? []) {
    if (dest.includes(excluded.toLowerCase())) {
      issues.push(
        `Destination "${request.destination}" excluded (visa/legal): ${excluded}`,
      );
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
