import { test } from "node:test";
import assert from "node:assert/strict";
import { swipesToAnswers } from "../../src/skills/onboarding/swipe.js";
import { SWIPE_DECK } from "../../src/skills/onboarding/swipe-cards.js";

test("swipes map to structured taste profile", () => {
  const answers = swipesToAnswers([
    { cardId: "slow-cafe-morning", direction: "right" },
    { cardId: "street-food", direction: "super" },
    { cardId: "hidden-courtyard", direction: "right" },
    { cardId: "early-alarm", direction: "left" },
    { cardId: "noisy-hostel", direction: "left" },
  ]);

  assert.equal(answers.pace?.dailyActivityDensity, "light");
  assert.equal(answers.food?.adventurousness, 5);
  assert.ok(answers.food?.cuisineLoves?.includes("street-food"));
  assert.equal(answers.comfortRisk?.offBeatenPath, 5);
  assert.equal(answers.dealBreakers?.biggestRuiner, "early morning starts");
  assert.ok(answers.accommodation?.dealBreakers?.includes("noisy-environment"));
});

test("rejecting familiar chain marks low adventurousness", () => {
  const answers = swipesToAnswers([
    { cardId: "familiar-chain", direction: "left" },
  ]);
  assert.ok(answers.food?.cuisineAvoids?.includes("chains"));
});

test("every swipe card has a curated Unsplash image", () => {
  for (const card of SWIPE_DECK) assert.match(card.imageUrl, /^https:\/\/images\.unsplash\.com\//, card.id);
});
