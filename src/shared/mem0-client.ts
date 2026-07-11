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

type Fetcher = typeof fetch;

interface Mem0Memory {
  memory?: string;
  created_at?: string;
}

/**
 * Hosted Mem0 adapter. Profiles are persisted as a versioned JSON memory so
 * this app's structured profile contract remains intact while notes/evidence
 * can be appended as ordinary durable memories.
 */
export class HostedMem0Client implements Mem0Client {
  private readonly cache = new Map<UserId, TravellerProfile>();

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly baseUrl = "https://api.mem0.ai/v3",
  ) {}

  async getProfile(userId: UserId): Promise<TravellerProfile | null> {
    const cached = this.cache.get(userId);
    if (cached) return cached;
    const response = await this.request("/memories/?page=1&page_size=50", {
      method: "POST",
      body: JSON.stringify({ filters: { user_id: userId } }),
    });
    const payload: unknown = await response.json();
    const results = payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)
      ? (payload as { results: Mem0Memory[] }).results
      : [];
    const profileMemory = results
      .map((memory) => memory.memory)
      .filter((memory): memory is string => Boolean(memory?.startsWith("hermes_profile:")))
      .map((memory) => memory.slice("hermes_profile:".length))
      .map((value) => {
        try { return JSON.parse(value) as TravellerProfile; } catch { return null; }
      })
      .filter((profile): profile is TravellerProfile => profile?.userId === userId)
      .at(-1) ?? null;
    if (profileMemory) this.cache.set(userId, profileMemory);
    return profileMemory;
  }

  async saveProfile(profile: TravellerProfile): Promise<void> {
    this.cache.set(profile.userId, profile);
    await this.add(profile.userId, `hermes_profile:${JSON.stringify(profile)}`);
  }

  async remember(userId: UserId, note: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (profile) {
      profile.notes.push(note);
      await this.saveProfile(profile);
      return;
    }
    await this.add(userId, `hermes_note:${note}`);
  }

  async recordEvidence(userId: UserId, entry: EvidenceEntry): Promise<void> {
    const profile = await this.getProfile(userId);
    if (profile) {
      profile.evidence.push(entry);
      await this.saveProfile(profile);
      return;
    }
    await this.add(userId, `hermes_evidence:${JSON.stringify(entry)}`);
  }

  private async add(userId: UserId, memory: string): Promise<void> {
    await this.request("/memories/add/", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: memory }],
        user_id: userId,
      }),
    });
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`Mem0 request failed (${response.status})`);
    return response;
  }
}

/** Uses hosted Mem0 when configured; otherwise preserves offline development. */
export function createMem0Client(): Mem0Client {
  const apiKey = process.env.MEM0_API_KEY?.trim();
  return apiKey ? new HostedMem0Client(apiKey) : new InMemoryMem0();
}
