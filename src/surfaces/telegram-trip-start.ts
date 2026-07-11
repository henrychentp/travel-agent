/**
 * Board -> Telegram trip-start handoff.
 *
 * The Board only packages the traveller's selected, already-confirmed trip.
 * Telegram is the receiving surface and deliberately reuses `Hermes.plan`, so
 * all planning continues through the established planner -> Director path.
 *
 * Telegram providers may redeliver an update. A handoff id is therefore
 * required and is deduplicated for the lifetime of this receiver. Keep the
 * same id when retrying a delivery; use a new id only for a new Board action.
 */

import type { TripPlan, TripRequest, UserId } from "../shared/schemas.js";
import { randomUUID } from "node:crypto";

/** The narrow part of Hermes used by this surface. */
export interface TripStartPlanner {
  plan(userId: UserId, request: TripRequest): Promise<TripPlan>;
}

/** Payload emitted when a traveller presses "Plan this trip" on the Board. */
export interface BoardTripStart {
  /** Stable id created by the Board for this one user action. */
  handoffId: string;
  userId: UserId;
  request: TripRequest;
}

/** Explicit wire shape so a Telegram adapter need not know Board internals. */
export interface TelegramTripStartMessage extends BoardTripStart {
  kind: "trip-start";
}

/** The single-use Telegram deep link returned to the Board. */
export interface TelegramTripStartLink {
  handoffId: string;
  url: string;
}

/** Safe user-facing error for an expired, malformed, or already-used link. */
export class InvalidTripStartLinkError extends Error {
  constructor() {
    super("This trip-start link is invalid or has already been used. Return to the Board to start the trip again.");
    this.name = "InvalidTripStartLinkError";
  }
}

export function toTelegramTripStart(
  start: BoardTripStart,
): TelegramTripStartMessage {
  if (!start.handoffId.trim()) {
    throw new Error("Board trip-start handoff requires a non-empty handoffId");
  }
  if (!start.userId.trim()) {
    throw new Error("Board trip-start handoff requires a non-empty userId");
  }

  return { ...start, kind: "trip-start" };
}

/**
 * Board-side issuer for Telegram's `?start=` deep link. The opaque token keeps
 * trip details out of the URL. A token can be redeemed once; issuing the same
 * Board action again returns its original link instead of creating a second
 * trip-start handoff.
 *
 * The in-memory registry is suitable for the current local adapter. A deployed
 * Board should back the same issue/redeem contract with its persistent store.
 */
export class BoardTripStartLinkIssuer {
  private readonly pending = new Map<string, TelegramTripStartMessage>();
  private readonly issued = new Map<string, TelegramTripStartLink>();

  constructor(
    private readonly telegramBotUrl: string,
    private readonly newToken: () => string = randomUUID,
  ) {}

  issue(start: BoardTripStart): TelegramTripStartLink {
    const existing = this.issued.get(start.handoffId);
    if (existing) return existing;

    const message = toTelegramTripStart(start);
    const token = this.newToken();
    if (!token) throw new Error("Trip-start link token cannot be empty");

    const url = new URL(this.telegramBotUrl);
    url.searchParams.set("start", token);
    const link = { handoffId: start.handoffId, url: url.toString() };
    this.pending.set(token, message);
    this.issued.set(start.handoffId, link);
    return link;
  }

  redeem(token: string): TelegramTripStartMessage {
    const message = this.pending.get(token);
    if (!message) throw new InvalidTripStartLinkError();
    this.pending.delete(token);
    return message;
  }
}

/**
 * Telegram-side receiver. It invokes Hermes exactly once for a handoff id,
 * including when the same Telegram update is delivered concurrently.
 */
export class TelegramTripStartReceiver {
  private readonly completed = new Map<string, Promise<TripPlan>>();

  constructor(private readonly planner: TripStartPlanner) {}

  receive(message: TelegramTripStartMessage): Promise<TripPlan> {
    const prior = this.completed.get(message.handoffId);
    if (prior) return prior;

    const plan = this.planner.plan(message.userId, message.request);
    this.completed.set(message.handoffId, plan);

    // A transient failure must remain retryable with the original handoff id.
    void plan.catch(() => {
      if (this.completed.get(message.handoffId) === plan) {
        this.completed.delete(message.handoffId);
      }
    });
    return plan;
  }
}

/**
 * In-process bridge used by the Board action and tests. A production Telegram
 * webhook can call `receiver.receive(toTelegramTripStart(start))` unchanged.
 */
export function handoffBoardTripStart(
  start: BoardTripStart,
  receiver: TelegramTripStartReceiver,
): Promise<TripPlan> {
  return receiver.receive(toTelegramTripStart(start));
}
