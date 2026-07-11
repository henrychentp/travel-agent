import { chat } from "../../shared/llm.js";
import type { OnboardingAnswers } from "../../shared/schemas.js";
import { buildExtractionSystemPrompt } from "./prompts.js";

export interface ExtractionResult {
  answers: OnboardingAnswers;
  learned: string[];
}

/** Pull structured profile fields from free-text traveller input. */
export async function extractAnswers(
  userMessage: string,
  conversationContext?: string,
): Promise<ExtractionResult> {
  const context = conversationContext
    ? `\n\nRecent context:\n${conversationContext}`
    : "";

  const raw = await chat([
    { role: "system", content: buildExtractionSystemPrompt() },
    {
      role: "user",
      content: `Extract preferences from this message:${context}\n\n"${userMessage}"`,
    },
  ]);

  const answers = parseExtractionJson(raw);
  const learned = describeLearned(answers);
  return { answers, learned };
}

function parseExtractionJson(raw: string): OnboardingAnswers {
  const trimmed = raw.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = jsonBlock?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate) as OnboardingAnswers;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as OnboardingAnswers;
    }
    return {};
  }
}

function describeLearned(answers: OnboardingAnswers): string[] {
  const learned: string[] = [];

  if (answers.identity?.homeCity)
    learned.push(`home base ${answers.identity.homeCity}`);
  if (answers.motivations?.primary?.length)
    learned.push(`motivations: ${answers.motivations.primary.join(", ")}`);
  if (answers.motivations?.desiredEmotion)
    learned.push(`desired feeling: ${answers.motivations.desiredEmotion}`);
  if (answers.accommodation?.types?.length)
    learned.push(`accommodation: ${answers.accommodation.types.join(", ")}`);
  if (answers.food?.cuisineLoves?.length)
    learned.push(`cuisine loves: ${answers.food.cuisineLoves.join(", ")}`);
  if (answers.constraints?.dietaryRestrictions?.length)
    learned.push(
      `dietary: ${answers.constraints.dietaryRestrictions.join(", ")}`,
    );
  if (answers.dealBreakers?.biggestRuiner)
    learned.push(`trip ruiner: ${answers.dealBreakers.biggestRuiner}`);
  if (answers.notes?.length)
    learned.push(...answers.notes.map((n) => `note: ${n}`));

  return learned;
}
