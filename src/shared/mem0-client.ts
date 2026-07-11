/**
 * Mem0 client — durable traveller taste + preferences.
 *
 * Mem0 stores TASTE (what the traveller is like), not trip facts. It is the
 * memory that persists across trips so the concierge can replan "using
 * remembered taste".
 *
 * This file ships with a zero-dependency in-memory implementation so the repo
 * runs out of the box. Swap `InMemoryMem0` for the real Mem0 SDK when ready:
 *
 *   import MemoryClient from "mem0ai";      // npm i mem0ai
 *   const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
 */

import type { EvidenceEntry, TravellerProfile, UserId } from "./schemas.js";

export interface Mem0Client {
  /** Load the durable profile for a user, or null if they are new. */
  getProfile(userId: UserId): Promise<TravellerProfile | null>;
  /** Persist (upsert) the durable profile. */
  saveProfile(profile: TravellerProfile): Promise<void>;
  /** Append a free-form durable memory ("prefers late checkout"). */
  remember(userId: UserId, note: string): Promise<void>;
  /** Record a passively-observed signal (revealed behaviour) on the profile. */
  recordEvidence(userId: UserId, entry: EvidenceEntry): Promise<void>;
}

/** Default in-memory implementation. Replace with the Mem0 SDK in production. */
export class InMemoryMem0 implements Mem0Client {
  private store = new Map<UserId, TravellerProfile>();

  async getProfile(userId: UserId): Promise<TravellerProfile | null> {
    return this.store.get(userId) ?? null;
  }

  async saveProfile(profile: TravellerProfile): Promise<void> {
    this.store.set(profile.userId, profile);
  }

  async remember(userId: UserId, note: string): Promise<void> {
    const p = this.store.get(userId);
    if (!p) return;
    p.notes.push(note);
    this.store.set(userId, p);
  }

  async recordEvidence(userId: UserId, entry: EvidenceEntry): Promise<void> {
    const p = this.store.get(userId);
    if (!p) return;
    p.evidence.push(entry);
    this.store.set(userId, p);
  }
}

/** Factory. TODO: return a real Mem0-backed client when MEM0_API_KEY is set. */
export function createMem0Client(): Mem0Client {
  return new InMemoryMem0();
}
