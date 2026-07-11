/**
 * End-to-end happy path (mirrors the flow in the architecture diagram):
 *
 *   Onboard -> Plan the complete trip -> Introduce disruption ->
 *   Concierge replans using remembered taste.
 *
 * Runs on Node's built-in test runner:  node --test  (via `npm test`).
 * Uses the default in-memory Mem0 + Trip Store, so no external services needed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Hermes } from "../../src/orchestrator/index.js";

test("onboard -> plan -> disrupt -> replan", async () => {
  const hermes = new Hermes({ now: () => "2026-07-11T00:00:00.000Z" });
  const userId = "henry";

  // 1 · Onboard — learn durable taste, written to Mem0.
  const profile = await hermes.onboard(userId, {
    homeCity: "Singapore",
    budgetTier: "comfort",
    pace: "balanced",
    interests: ["food", "hiking"],
    dietary: ["no-pork"],
    seatPreference: "aisle",
    freeText: "hates early-morning flights",
  });
  assert.equal(profile.userId, userId);
  assert.deepEqual(profile.interests, ["food", "hiking"]);
  assert.ok(profile.notes.includes("hates early-morning flights"));

  // 2 · Plan the complete trip — persisted to Trip State as v1.
  const plan = await hermes.plan(userId, {
    destination: "Tokyo",
    startDate: "2026-08-14",
    endDate: "2026-08-20",
    travellers: 1,
  });
  assert.equal(plan.version, 1);
  assert.equal(plan.userId, userId);

  // 3 · Introduce a disruption -> concierge proposes a patch.
  const patch = await hermes.liveNeed(userId, plan.tripId, {
    text: "My afternoon flight got cancelled — need to get to Kyoto today.",
    location: "Tokyo",
  });
  assert.equal(patch.tripId, plan.tripId);

  // 4 · Apply the (approved) patch -> new version committed to Trip State.
  const replanned = await hermes.applyPatch(patch);
  assert.equal(replanned.version, 2, "replan should bump the trip version");
});
