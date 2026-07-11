import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenAICulture } from "../../src/core/workers/culture.js";
import { emptyProfile } from "../../src/shared/schemas.js";

test("OpenAI Culture Concierge grounds its prompt in profile and proposed ops", async () => {
  let prompt = "";
  const culture = new OpenAICulture(async (messages) => {
    prompt = messages[1]?.content ?? "";
    return "A relaxed food-focused afternoon that matches the traveller's interests.";
  });
  const profile = emptyProfile("henry", "2026-07-11T00:00:00.000Z");
  profile.activities.categories = ["food", "walks"];

  const brief = await culture.curate(profile, [{
    op: "add",
    date: "2026-09-01",
    after: { kind: "activity", title: "Time Out Market", date: "2026-09-01" },
    reason: "Linkup candidate",
  }]);

  assert.match(prompt, /food, walks/);
  assert.match(prompt, /Time Out Market/);
  assert.match(brief.summary, /food-focused/);
});
