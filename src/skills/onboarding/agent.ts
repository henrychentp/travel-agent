import { chat } from "../../shared/llm.js";
import type { Mem0Client } from "../../shared/mem0-client.js";
import {
  MINIMUM_VIABLE_CATEGORIES,
  type ProfileCategory,
  type TravellerProfile,
  type UserId,
} from "../../shared/schemas.js";
import { extractAnswers } from "./extract.js";
import { onboardUser, type OnboardingDeps } from "./index.js";
import {
  buildOnboardingSystemPrompt,
  buildReplyUserPrompt,
} from "./prompts.js";
import { nextQuestion, type OnboardingQuestion } from "./questions.js";

export interface OnboardingTurnResult {
  reply: string;
  profile: TravellerProfile;
  complete: boolean;
  progress: { filled: number; total: number; nextCategory: ProfileCategory | null };
}

export interface OnboardingAgentDeps extends OnboardingDeps {
  mem0: Mem0Client;
}

/**
 * Conversational onboarding agent.
 * Each turn: extract structured taste → persist to Mem0 → reply with personalized tone.
 */
export class OnboardingAgent {
  private deps: OnboardingAgentDeps;
  private history: string[] = [];

  constructor(deps: OnboardingAgentDeps) {
    this.deps = deps;
  }

  /** Opening message for a new or returning traveller. */
  async greet(userId: UserId): Promise<OnboardingTurnResult> {
    const profile =
      (await this.deps.mem0.getProfile(userId)) ??
      (await onboardUser(userId, {}, this.deps));

    const filled = filledCategories(profile);
    const q = nextQuestion(filled);
    const complete = q === null;

    const reply = complete
      ? await this.generateReply(
          profile,
          "I'm back — anything about my travel taste changed?",
          null,
          [],
        )
      : await this.generateReply(
          profile,
          "(session start)",
          q,
          [],
          true,
        );

    return {
      reply,
      profile,
      complete,
      progress: progress(filled, q?.category ?? null),
    };
  }

  /** Process one traveller message and advance the profile. */
  async turn(userId: UserId, message: string): Promise<OnboardingTurnResult> {
    this.history.push(`Traveller: ${message}`);

    const { answers, learned } = await extractAnswers(
      message,
      this.history.slice(-6).join("\n"),
    );

    const profile = await onboardUser(userId, answers, this.deps);
    const filled = filledCategories(profile);
    const q = nextQuestion(filled);
    const complete = q === null;

    const reply = await this.generateReply(profile, message, q, learned);
    this.history.push(`Hermes: ${reply}`);

    return {
      reply,
      profile,
      complete,
      progress: progress(filled, q?.category ?? null),
    };
  }

  private async generateReply(
    profile: TravellerProfile,
    userMessage: string,
    nextQ: OnboardingQuestion | null,
    learned: string[],
    isGreeting = false,
  ): Promise<string> {
    const system = buildOnboardingSystemPrompt(profile);
    const user = isGreeting
      ? `This is the opening of onboarding. Welcome them warmly and ask your first question.\n\n${nextQ ? `First question (${nextQ.category}): ${nextQ.prompt}` : ""}`
      : buildReplyUserPrompt(userMessage, nextQ, learned);

    return chat([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
  }
}

function filledCategories(profile: TravellerProfile): Set<ProfileCategory> {
  const filled = new Set<ProfileCategory>();
  for (const cat of MINIMUM_VIABLE_CATEGORIES) {
    if (Object.keys(profile[cat]).length > 0) filled.add(cat);
  }
  if (Object.keys(profile.dealBreakers).length > 0) filled.add("dealBreakers");
  if (Object.keys(profile.social).length > 0) filled.add("social");
  if (Object.keys(profile.brandLoyalty).length > 0) filled.add("brandLoyalty");
  return filled;
}

function progress(
  filled: Set<ProfileCategory>,
  nextCategory: ProfileCategory | null,
): OnboardingTurnResult["progress"] {
  const total = MINIMUM_VIABLE_CATEGORIES.length + 1; // + dealBreakers
  return { filled: filled.size, total, nextCategory };
}
