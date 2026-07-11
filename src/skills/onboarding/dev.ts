/**
 * Onboarding workstream dev runner (Person 1).
 *
 *   npm start
 *
 * Verifies OpenAI, runs onboardUser, prints the TravellerProfile.
 * Requires local `.env` — never commit it.
 */

import { createMem0Client } from "../../shared/mem0-client.js";
import { chat, getDefaultModel } from "../../shared/llm.js";
import { getOpenAIKey } from "../../shared/env.js";
import { onboardUser } from "./index.js";

async function verifyOpenAI(): Promise<void> {
  getOpenAIKey();
  const model = getDefaultModel();
  const reply = await chat([
    {
      role: "system",
      content:
        "You are Hermes onboarding assistant. Reply in one short sentence.",
    },
    {
      role: "user",
      content: `Confirm you are online (model: ${model}).`,
    },
  ]);
  console.log(`OpenAI connected (${model}):`, reply);
}

async function runOnboardingDemo(): Promise<void> {
  const mem0 = createMem0Client();
  const userId = "demo-traveller";

  console.log("\n--- Onboarding demo ---");
  const profile = await onboardUser(
    userId,
    {
      homeCity: "Singapore",
      budgetTier: "comfort",
      pace: "balanced",
      interests: ["food", "hiking"],
      dietary: ["no-pork"],
      seatPreference: "aisle",
      freeText:
        "hates early-morning flights, prefers boutique hotels over chains",
    },
    { mem0 },
  );

  console.log("TravellerProfile:", JSON.stringify(profile, null, 2));
  console.log(
    "\nNext: wire LLM enrichment in src/skills/onboarding/index.ts (TODO Person 1).",
  );
}

try {
  await verifyOpenAI();
  await runOnboardingDemo();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
