/**
 * Onboarding workstream dev runner (Person 1).
 *
 *   npm start
 *
 * Verifies OpenAI on gpt-5.6-terra, runs a multi-turn onboarding demo.
 * Requires local `.env` — never commit it.
 */

import { createMem0Client } from "../../shared/mem0-client.js";
import { getDefaultModel } from "../../shared/llm.js";
import { getOpenAIKey } from "../../shared/env.js";
import { OnboardingAgent } from "./agent.js";
import { chat } from "../../shared/llm.js";

const DEMO_TURNS = [
  "I'm based in Singapore, fly out of Changi. Singaporean passport. I take about 3 leisure trips a year, usually 5-7 days.",
  "I travel mostly for food and culture. After a great trip I want to feel recharged and inspired — I love discovering new places.",
  "Moderate pace — 2-3 things a day max. I hate early flights. I can walk a lot but need quiet evenings.",
  "Boutique hotels with calm, design-forward vibes. Deal-breaker: noisy streets or big chain feel.",
  "Premium economy long-haul, aisle seat, loyal to Singapore Airlines. No red-eye departures.",
  "No pork, love Japanese and Italian. Pretty adventurous — street food to tasting menus.",
  "Food, hiking, museums. Physical level medium. Low nightlife.",
  "Comfortable around 3-4k SGD per trip. Splurge on food, save on shopping.",
  "Safety matters but I like some novelty. Okay with a bit of friction for something special.",
  "Temperate climates, hate humidity. Sensitive to noise when sleeping.",
  "No mobility issues. Can't visit North Korea for visa reasons.",
  "WhatsApp updates, high-level summaries, show me 2-3 options.",
  "Best trip was Kyoto last spring — slow mornings, incredible kaiseki. Biggest ruiner: 5am airport transfers.",
];

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

async function runConversationalDemo(): Promise<void> {
  const mem0 = createMem0Client();
  const agent = new OnboardingAgent({ mem0 });
  const userId = "demo-traveller";

  console.log("\n--- Conversational onboarding demo ---\n");

  const opening = await agent.greet(userId);
  console.log(`Hermes: ${opening.reply}`);
  console.log(`[${opening.progress.filled}/${opening.progress.total} categories]\n`);

  for (const message of DEMO_TURNS) {
    console.log(`Traveller: ${message}`);
    const result = await agent.turn(userId, message);
    console.log(`Hermes: ${result.reply}`);
    console.log(
      `[${result.progress.filled}/${result.progress.total}${result.complete ? " — COMPLETE" : ` — next: ${result.progress.nextCategory}`}]\n`,
    );
    if (result.complete) break;
  }

  const final = await mem0.getProfile(userId);
  console.log("--- Final TravellerProfile ---");
  console.log(JSON.stringify(final, null, 2));
}

try {
  await verifyOpenAI();
  await runConversationalDemo();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
