import { test } from "node:test";
import assert from "node:assert/strict";
import { runRevisionLoop } from "../../src/core/revision-loop.js";
import { emptyProfile, type PatchOp } from "../../src/shared/schemas.js";

const activity = (date: string, title: string, location = "Paris"): PatchOp => ({
  op: "add",
  date,
  after: { kind: "activity", title, date, location },
  reason: "Scout candidate",
});

test("Logistics protects downtime, trip dates, duplicates, and low-walking geography", () => {
  const profile = emptyProfile("traveller", "2026-07-11T00:00:00.000Z");
  profile.pace.dailyActivityDensity = "moderate";
  profile.pace.dailyDowntime = { required: true, minutes: 120 };
  profile.pace.walkingTolerance = "low";
  const result = runRevisionLoop(profile, [
    activity("2026-09-12", "Louvre", "Rivoli"),
    activity("2026-09-12", "Louvre", "Rivoli"),
    activity("2026-09-12", "Montmartre walk", "Montmartre"),
    activity("2026-09-14", "Outside trip"),
  ], {
    now: "2026-07-11T00:00:00.000Z",
    tripStart: "2026-09-11",
    tripEnd: "2026-09-13",
  });

  assert.deepEqual(result.ops.map((op) => op.after?.kind === "activity" ? op.after.title : "other"), ["Louvre"]);
  assert.deepEqual(result.dropped.map((drop) => drop.reason), [
    "duplicate activity candidate",
    "low walking tolerance allows one activity area per day",
    "outside the trip date window",
  ]);
});
