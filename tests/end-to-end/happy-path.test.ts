/**
 * End-to-end happy path (mirrors the flow in the architecture diagram):
 *
 *   Onboard -> Plan the complete trip -> Introduce disruption ->
 *   Concierge replans using remembered taste.
 *
 * Runs on Node's built-in test runner via `npm test` (compiled to dist first).
 * Uses the default in-memory Mem0 + Trip Store, so no external services needed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Hermes } from "../../src/orchestrator/index.js";

test("onboard -> plan -> disrupt -> replan", async () => {
  const hermes = new Hermes({ now: () => "2026-07-11T00:00:00.000Z" });
  const userId = "henry";

  // 1 · Onboard — populate the durable taste profile, written to Mem0.
  const profile = await hermes.onboard(userId, {
    identity: {
      homeCity: "Singapore",
      departureAirports: ["SIN"],
      typicalTripLengthDays: 6,
    },
    motivations: {
      primary: ["food", "culture"],
      desiredEmotion: "recharged and inspired",
      explorationVsReturn: 4,
    },
    pace: {
      dailyActivityDensity: "moderate",
      structureVsSpontaneity: 3,
      walkingTolerance: "high",
      earlyDepartureTolerance: 1,
    },
    accommodation: {
      types: ["boutique-hotel"],
      vibe: ["calm", "design-forward"],
      amenityMustHaves: ["good-wifi"],
      dealBreakers: ["noisy-street"],
    },
    transport: {
      cabinLongHaul: "premium-economy",
      seat: "aisle",
      airlineLoyalties: ["SQ"],
    },
    food: { cuisineLoves: ["japanese", "italian"], adventurousness: 4 },
    activities: { categories: ["food", "hiking", "museums"], physicalLevel: 3 },
    budget: {
      typicalRange: { min: 2000, max: 4000, currency: "SGD" },
      splurgeCategories: ["food"],
      saveCategories: ["shopping"],
    },
    comfortRisk: { safetyPriority: 4, comfortVsNovelty: 3 },
    sensory: { climates: ["temperate"], crowdTolerance: 3, noiseSensitivity: 4 },
    communication: { channels: ["push"], detailVsSummary: 2, optionCount: "few" },
    constraints: { dietaryRestrictions: ["no-pork"] },
    notes: ["hates early-morning flights"],
  });

  assert.equal(profile.userId, userId);
  assert.ok(profile.activities.categories?.includes("hiking"));
  assert.ok(profile.constraints.dietaryRestrictions?.includes("no-pork"));
  assert.ok(profile.notes.includes("hates early-morning flights"));
  // Provided categories are marked as explicitly stated.
  assert.equal(profile.confidence.identity, 1);
  assert.equal(profile.lastConfirmed.food, "2026-07-11T00:00:00.000Z");

  // 2 · Plan the complete trip — hard constraints pass, persisted as v1.
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

test("hard constraint blocks an infeasible destination", async () => {
  const hermes = new Hermes({ now: () => "2026-07-11T00:00:00.000Z" });
  await hermes.onboard("nomad", {
    constraints: { legalVisaExclusions: ["North Korea"] },
  });

  await assert.rejects(
    () =>
      hermes.plan("nomad", {
        destination: "North Korea",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        travellers: 1,
      }),
    /hard constraints/i,
  );
});
