/**
 * Agent A · Local Scout.
 *
 * Queries real-time web layers for open venues + raw sentiment and returns
 * candidate bookings. Used identically whether we are planning a whole trip or
 * reacting to a live need — only the ScoutContext scope changes.
 */

import type { Booking, ISODate, TravellerProfile } from "../../shared/schemas.js";
import type { LiveTools } from "../../tools/index.js";
import {
  createLinkupSearch,
  type LinkupSearch,
} from "../../tools/linkup.js";

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

function dateForResult(start: ISODate, index: number): ISODate {
  const date = new Date(`${start}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
}

function scoutQuery(profile: TravellerProfile, ctx: ScoutContext): string {
  const interests = profile.activities.categories?.join(", ") || "local culture";
  const food = profile.food.cuisineLoves?.join(", ");
  const pace = profile.pace.dailyActivityDensity || "moderate";
  return [
    `Current, open ${interests} recommendations in ${ctx.destination}`,
    `for ${ctx.start} to ${ctx.end}`,
    `at a ${pace} pace`,
    food ? `with ${food} food options` : "",
    ctx.focus ? `Traveller request: ${ctx.focus}` : "",
  ].filter(Boolean).join(". ");
}

/** Local Scout backed by Linkup's real-time web search. */
export class LinkupScout implements Scout {
  constructor(private readonly linkup: LinkupSearch) {}

  async find(
    profile: TravellerProfile,
    ctx: ScoutContext,
    _tools: LiveTools,
  ): Promise<ScoutFindings> {
    const results = await this.linkup.search(scoutQuery(profile, ctx));
    const options: Booking[] = results.flatMap((result, index) => {
      const title = result.name?.trim();
      if (!title) return [];
      return [{
        kind: "activity" as const,
        title,
        date: dateForResult(ctx.start, index),
        location: ctx.location ?? ctx.destination,
        ...(result.url ? { sourceUrl: result.url } : {}),
      }];
    });
    return {
      options,
      sentiment: Object.fromEntries(options.map((option) => [
        option.kind === "activity" ? option.title : option.kind,
        0,
      ])),
    };
  }
}

export function createScout(): Scout {
  const linkup = createLinkupSearch();
  return linkup ? new LinkupScout(linkup) : new StubScout();
}
