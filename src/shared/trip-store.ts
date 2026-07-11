/**
 * Trip Store — the Trip State store from the diagram.
 *
 * Stores FACTS: bookings + itinerary + version history for one `tripId`.
 * Distinct from Mem0 (which stores taste). Every planner/concierge change
 * produces a new version so we can audit and roll back.
 *
 * Ships with an in-memory implementation; swap for a real DB (e.g. Postgres,
 * DynamoDB, SQLite) behind the same interface.
 */

import type { TripId, TripPlan, TripState, UserId } from "./schemas.js";

export interface TripStore {
  /** Read the full state (current + history) for a trip. */
  get(tripId: TripId): Promise<TripState | null>;
  /** Create the first version of a trip. */
  create(plan: TripPlan): Promise<TripState>;
  /** Commit a new version, pushing the old current into history. */
  commit(plan: TripPlan): Promise<TripState>;
  /** List all trips for a user. */
  listByUser(userId: UserId): Promise<TripState[]>;
}

export class InMemoryTripStore implements TripStore {
  private store = new Map<TripId, TripState>();

  async get(tripId: TripId): Promise<TripState | null> {
    return this.store.get(tripId) ?? null;
  }

  async create(plan: TripPlan): Promise<TripState> {
    const state: TripState = {
      tripId: plan.tripId,
      userId: plan.userId,
      current: plan,
      history: [],
    };
    this.store.set(plan.tripId, state);
    return state;
  }

  async commit(plan: TripPlan): Promise<TripState> {
    const existing = this.store.get(plan.tripId);
    if (!existing) return this.create(plan);
    existing.history.push(existing.current);
    existing.current = plan;
    this.store.set(plan.tripId, existing);
    return existing;
  }

  async listByUser(userId: UserId): Promise<TripState[]> {
    return [...this.store.values()].filter((s) => s.userId === userId);
  }
}

export function createTripStore(): TripStore {
  return new InMemoryTripStore();
}
