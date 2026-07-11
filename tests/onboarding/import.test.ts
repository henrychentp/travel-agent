import { test } from "node:test";
import assert from "node:assert/strict";
import { importToAnswers } from "../../src/skills/onboarding/import-context.js";

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

test("location import sets city", () => {
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

  assert.equal(answers.identity?.homeCity, "Barcelona");
});
