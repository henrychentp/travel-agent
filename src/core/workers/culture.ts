/**
 * Agent C · Culture Concierge.
 *
 * Synthesizes the proposed changes into an elegant, highly curated brief
 * (and optionally a voice script). Shared by planner and concierge.
 */

import type { PatchOp, TravellerProfile } from "../../shared/schemas.js";
import { chat, type ChatMessage } from "../../shared/llm.js";

export interface CultureBrief {
  summary: string;
  highlights: string[];
  /** Optional narration script. TODO(Agent C): render via ElevenLabs. */
  audioScript?: string;
}

export interface Culture {
  curate(profile: TravellerProfile, ops: PatchOp[]): Promise<CultureBrief>;
}

/** Stub Culture — one-line summary. TODO(Agent C): LLM-curated brief + audio. */
export class StubCulture implements Culture {
  async curate(_profile: TravellerProfile, ops: PatchOp[]): Promise<CultureBrief> {
    return {
      summary:
        ops.length === 0
          ? "No changes proposed."
          : `${ops.length} change(s) proposed.`,
      highlights: [],
    };
  }
}

type Chat = (messages: ChatMessage[]) => Promise<string>;

/** OpenAI-backed curator, enabled only for an explicit live run. */
export class OpenAICulture implements Culture {
  constructor(private readonly chatFn: Chat = chat) {}

  async curate(profile: TravellerProfile, ops: PatchOp[]): Promise<CultureBrief> {
    const interests = profile.activities.categories?.join(", ") || "the traveller's stated preferences";
    const candidates = ops.map((op) => op.after?.kind === "activity" ? op.after.title : op.reason)
      .filter(Boolean)
      .join("; ") || "No viable candidates were found.";
    const summary = await this.chatFn([
      {
        role: "system",
        content: "You are Hermes's Culture Concierge. Write one concise, factual itinerary rationale. Never invent bookings, availability, prices, or sources.",
      },
      {
        role: "user",
        content: `Traveller interests: ${interests}. Proposed itinerary changes: ${candidates}. Explain why this fits in at most 70 words.`,
      },
    ]);
    return { summary, highlights: [] };
  }
}

export function createCulture(): Culture {
  return process.env.HERMES_LIVE_CULTURE === "true" && process.env.OPENAI_API_KEY
    ? new OpenAICulture()
    : new StubCulture();
}
