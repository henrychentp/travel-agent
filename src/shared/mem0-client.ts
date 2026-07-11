/**
 * Mem0 client — durable traveller taste + preferences.
 *
 * Mem0 stores TASTE (what the traveller is like), not trip facts. It is the
 * memory that persists across trips so the concierge can replan "using
 * remembered taste".
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
  metadata?: Record<string, unknown>;
}

interface Mem0AddResponse {
  status?: string;
  event_id?: string;
}

interface Mem0EventResponse {
  status?: string;
}

const PROFILE_PREFIX = "hermes_profile:";

function parseProfileMemory(
  memory: string | undefined,
  userId: UserId,
): TravellerProfile | null {
  if (!memory?.startsWith(PROFILE_PREFIX)) return null;
  try {
    const profile = JSON.parse(memory.slice(PROFILE_PREFIX.length)) as TravellerProfile;
    return profile?.userId === userId ? profile : null;
  } catch {
    return null;
  }
}

/**
 * Hosted Mem0 adapter. Profiles are persisted as versioned JSON memories with
 * infer=false so Mem0 stores the payload verbatim (v3 defaults to LLM extraction).
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

    const response = await this.request("/memories/?page=1&page_size=100", {
      method: "POST",
      body: JSON.stringify({ filters: { user_id: userId } }),
    });
    const payload: unknown = await response.json();
    const results =
      payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)
        ? (payload as { results: Mem0Memory[] }).results
        : [];

    const profileMemory = results
      .map((row) => ({
        profile: parseProfileMemory(row.memory, userId),
        createdAt: row.created_at ?? "",
      }))
      .filter((row): row is { profile: TravellerProfile; createdAt: string } => row.profile !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .at(-1)?.profile ?? null;

    if (profileMemory) this.cache.set(userId, profileMemory);
    return profileMemory;
  }

  async saveProfile(profile: TravellerProfile): Promise<void> {
    this.cache.set(profile.userId, profile);
    await this.add(profile.userId, `${PROFILE_PREFIX}${JSON.stringify(profile)}`, {
      hermes_type: "profile",
    });
  }

  async remember(userId: UserId, note: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (profile) {
      profile.notes.push(note);
      await this.saveProfile(profile);
      return;
    }
    await this.add(userId, `hermes_note:${note}`, { hermes_type: "note" });
  }

  async recordEvidence(userId: UserId, entry: EvidenceEntry): Promise<void> {
    const profile = await this.getProfile(userId);
    if (profile) {
      profile.evidence.push(entry);
      await this.saveProfile(profile);
      return;
    }
    await this.add(userId, `hermes_evidence:${JSON.stringify(entry)}`, {
      hermes_type: "evidence",
    });
  }

  private async add(
    userId: UserId,
    memory: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    const response = await this.request("/memories/add/", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: memory }],
        user_id: userId,
        infer: false,
        metadata,
      }),
    });
    const payload = (await response.json()) as Mem0AddResponse;
    if (payload.event_id) {
      await this.waitForEvent(payload.event_id);
    }
  }

  private async waitForEvent(
    eventId: string,
    timeoutMs = 12_000,
    intervalMs = 250,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await this.fetcher(`${this.baseUrl.replace("/v3", "")}/v1/event/${eventId}/`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Mem0 event poll failed (${response.status})`);
      }
      const payload = (await response.json()) as Mem0EventResponse;
      if (payload.status === "SUCCEEDED") return;
      if (payload.status === "FAILED") {
        throw new Error("Mem0 memory write failed");
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error("Mem0 memory write timed out");
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Mem0 request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    return response;
  }
}

/** Uses hosted Mem0 when configured; otherwise preserves offline development. */
export function createMem0Client(): Mem0Client {
  const apiKey = process.env.MEM0_API_KEY?.trim();
  return apiKey ? new HostedMem0Client(apiKey) : new InMemoryMem0();
}
