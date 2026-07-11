/**
 * Agent A · Local Scout.
 *
 * Queries real-time web layers for open venues + raw sentiment and returns
 * candidate bookings. Used identically whether we are planning a whole trip or
 * reacting to a live need — only the ScoutContext scope changes.
 */

import type { Booking, ISODate, TravellerProfile } from "../../shared/schemas.js";
import type { LiveTools } from "../../tools/index.js";

export interface ScoutContext {
  destination: string;
  start: ISODate;
  end: ISODate;
  /** Where the traveller currently is (live need) — narrows the search. */
  location?: string;
  /** Free-text focus, e.g. the live-need description. */
  focus?: string;
}

export interface ScoutFindings {
  options: Booking[];
  /** Option title -> sentiment score in [-1, 1]. */
  sentiment: Record<string, number>;
}

export interface Scout {
  find(
    profile: TravellerProfile,
    ctx: ScoutContext,
    tools: LiveTools,
  ): Promise<ScoutFindings>;
}

/** Stub Scout — returns nothing. TODO(Agent A): wire Linkup/web search. */
export class StubScout implements Scout {
  async find(): Promise<ScoutFindings> {
    return { options: [], sentiment: {} };
  }
}

export function createScout(): Scout {
  return new StubScout();
}
