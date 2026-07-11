import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Director,
  type DirectorBrief,
  type DirectorIntake,
} from "../../src/core/director.js";
import type { Culture } from "../../src/core/workers/culture.js";
import type { Logistics } from "../../src/core/workers/logistics.js";
import type { Scout, ScoutContext } from "../../src/core/workers/scout.js";
import { emptyProfile, type PatchOp } from "../../src/shared/schemas.js";

test("Director turns LLM intake into one shared brief for Scout, Logistics, and Culture", async () => {
  const calls: string[] = [];
  const brief: DirectorBrief = {
    priorities: ["quiet galleries", "natural wine"],
    scoutFocus: "Find quiet galleries and a natural-wine bar near the hotel.",
    logisticsRules: ["protect a 60 minute reset", "avoid long cross-city transfers"],
    cultureIntent: "A calm design-led afternoon with one memorable food moment.",
    missingInfo: [],
  };
  const intake: DirectorIntake = {
    async collect() {
      calls.push("intake");
      return brief;
    },
  };
  let scoutContext: ScoutContext | undefined;
  const scout: Scout = {
    async find(_profile, context) {
      calls.push("scout");
      scoutContext = context;
      return {
        options: [{ kind: "activity", title: "Quiet Gallery", date: "2026-09-01", location: "Lisbon", sourceUrl: "https://example.com/gallery" }],
        sentiment: {},
      };
    },
  };
  let logisticsRules: string[] | undefined;
  const logistics: Logistics = {
    async revise(_profile, ops, _context, rules) {
      calls.push("logistics");
      logisticsRules = rules;
      return { ops, dropped: [], issues: [] };
    },
  };
  let cultureIntent: string | undefined;
  const culture: Culture = {
    async curate(_profile, _ops: PatchOp[], intent) {
      calls.push("culture");
      cultureIntent = intent;
      return { summary: "A calm gallery-led afternoon.", highlights: [] };
    },
  };
  const profile = emptyProfile("henry", "2026-07-11T00:00:00.000Z");
  profile.activities.categories = ["museums"];

  const result = await new Director({
    intake,
    scout,
    logistics,
    culture,
    now: () => "2026-07-11T12:00:00.000Z",
  }).plan(profile, null, {
    kind: "full-plan",
    tripId: "henry-lisbon",
    userId: "henry",
    request: { destination: "Lisbon", startDate: "2026-09-01", endDate: "2026-09-02", travellers: 1 },
  });

  assert.deepEqual(calls, ["intake", "scout", "logistics", "culture"]);
  assert.match(scoutContext?.focus ?? "", /quiet galleries/);
  assert.deepEqual(logisticsRules, brief.logisticsRules);
  assert.equal(cultureIntent, brief.cultureIntent);
  assert.equal(result.rationale, "A calm gallery-led afternoon.");
});
