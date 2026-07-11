/**
 * Agent C · Culture Concierge.
 *
 * Synthesizes the proposed changes into an elegant, highly curated brief
 * (and optionally a voice script). Shared by planner and concierge.
 */

import type { PatchOp, TravellerProfile } from "../../shared/schemas.js";

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

export function createCulture(): Culture {
  return new StubCulture();
}
