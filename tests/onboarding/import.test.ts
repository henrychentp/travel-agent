import { test } from "node:test";
import assert from "node:assert/strict";
import { importToAnswers, applyDestinationCity } from "../../src/skills/onboarding/import-context.js";
import { InMemoryMem0 } from "../../src/shared/mem0-client.js";

test("calendar import detects food and work blocks", () => {
  const answers = importToAnswers({
    source: "google",
    data: {
      calendar: [
        { title: "Team sync", start: "2026-07-11T14:00:00Z" },
        { title: "Dinner at Disfrutar", start: "2026-07-11T20:00:00Z" },
      ],
      emails: [{ subject: "Your flight to BCN", snippet: "boarding pass" }],
    },
  });

  assert.equal(answers.pace?.dailyActivityDensity, "light");
  assert.ok(answers.notes?.some((n) => n.includes("food")));
  assert.ok(answers.notes?.some((n) => n.includes("flight")));
});

test("location import records precise coordinates without setting home city", () => {
  const answers = importToAnswers({
    source: "location",
    data: {
      location: {
        lat: 41.38,
        lng: 2.17,
        city: "Barcelona",
        country: "Spain",
        capturedAt: "2026-07-11T12:00:00.000Z",
      },
    },
  });

  assert.equal(answers.identity?.homeCity, undefined);
  assert.ok(answers.notes?.some((n) => n.includes("precise location")));
});

test("destination city persists to Mem0 profile", async () => {
  const mem0 = new InMemoryMem0();
  const profile = await applyDestinationCity("tg:42", "  Barcelona  ", { mem0 });
  assert.equal(profile.destinationCity, "Barcelona");
  const saved = await mem0.getProfile("tg:42");
  assert.equal(saved?.destinationCity, "Barcelona");
  assert.ok(saved?.evidence.some((e) => e.signal === "destination-selected"));
});
