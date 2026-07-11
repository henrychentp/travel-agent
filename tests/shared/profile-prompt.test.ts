import assert from "node:assert/strict";
import test from "node:test";
import { emptyProfile } from "../../src/shared/schemas.js";
import {
  hasTasteProfile,
  profilePromptContext,
} from "../../src/shared/profile-prompt.js";

test("hasTasteProfile accepts location, connectors, or swipe confidence", () => {
  assert.equal(hasTasteProfile(null), false);
  const blank = emptyProfile("tg:1", new Date().toISOString());
  assert.equal(hasTasteProfile(blank), false);

  blank.location = { lat: 1, lng: 2, city: "Lisbon", capturedAt: blank.updatedAt };
  assert.equal(hasTasteProfile(blank), true);

  const destinationOnly = emptyProfile("tg:3", new Date().toISOString());
  destinationOnly.destinationCity = "Kyoto";
  assert.equal(hasTasteProfile(destinationOnly), true);

  const connected = emptyProfile("tg:2", new Date().toISOString());
  connected.connectedSources = [{ id: "google", status: "connected", connectedAt: connected.updatedAt }];
  assert.equal(hasTasteProfile(connected), true);
});

test("profilePromptContext includes destination and precise location", () => {
  const profile = emptyProfile("tg:9", new Date().toISOString());
  profile.destinationCity = "Barcelona";
  profile.location = { lat: 0, lng: 0, city: "Tokyo", capturedAt: profile.updatedAt };
  profile.connectedSources = [{ id: "google", status: "connected", connectedAt: profile.updatedAt }];
  const ctx = JSON.parse(profilePromptContext(profile)) as {
    destinationCity?: string;
    location?: { city?: string };
    connectedSources?: string[];
  };
  assert.equal(ctx.destinationCity, "Barcelona");
  assert.equal(ctx.location?.city, "Tokyo");
  assert.deepEqual(ctx.connectedSources, ["google"]);
});
