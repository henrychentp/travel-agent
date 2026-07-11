import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getGoogleSetupInfo,
  googleAuthUrl,
} from "../../src/skills/onboarding/google.js";

test("googleAuthUrl includes redirect URI and traveller state", () => {
  const prev = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    WEBAPP_URL: process.env.WEBAPP_URL,
    VERCEL: process.env.VERCEL,
  };

  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
  process.env.WEBAPP_URL = "https://hermes-travel-agent.vercel.app";
  delete process.env.VERCEL;

  const url = googleAuthUrl("tg:99");
  assert.ok(url);
  const parsed = new URL(url!);
  assert.equal(
    parsed.searchParams.get("redirect_uri"),
    "https://hermes-travel-agent.vercel.app/api/connect/google/callback",
  );
  assert.equal(parsed.searchParams.get("state"), "tg:99");
  assert.match(parsed.searchParams.get("scope") ?? "", /gmail\.readonly/);

  const setup = getGoogleSetupInfo();
  assert.equal(setup.configured, true);
  assert.equal(
    setup.redirectUri,
    "https://hermes-travel-agent.vercel.app/api/connect/google/callback",
  );

  process.env.GOOGLE_CLIENT_ID = prev.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = prev.GOOGLE_CLIENT_SECRET;
  process.env.WEBAPP_URL = prev.WEBAPP_URL;
  process.env.VERCEL = prev.VERCEL;
});

test("googleAuthUrl returns null when OAuth env is incomplete", () => {
  const prev = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    WEBAPP_URL: process.env.WEBAPP_URL,
  };

  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.WEBAPP_URL;

  assert.equal(googleAuthUrl("tg:1"), null);
  assert.equal(getGoogleSetupInfo().configured, false);

  process.env.GOOGLE_CLIENT_ID = prev.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = prev.GOOGLE_CLIENT_SECRET;
  process.env.WEBAPP_URL = prev.WEBAPP_URL;
});
