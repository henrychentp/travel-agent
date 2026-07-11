import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getGoogleSetupInfo,
  googleAuthUrl,
  redactGoogleOAuth,
  saveGoogleTokens,
} from "../../src/skills/onboarding/google.js";
import { InMemoryMem0 } from "../../src/shared/mem0-client.js";
import { emptyProfile } from "../../src/shared/schemas.js";

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

  const withResume = googleAuthUrl("tg:99", "resume-token-abc");
  const resumeState = new URL(withResume!).searchParams.get("state");
  assert.notEqual(resumeState, "tg:99");
  assert.ok(resumeState && resumeState.length > 8);

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

test("google OAuth is blocked on Vercel preview deploys", () => {
  const prev = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    HERMES_ALLOW_GOOGLE_OAUTH: process.env.HERMES_ALLOW_GOOGLE_OAUTH,
  };

  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_URL = "travel-agent-pi-two.vercel.app";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "hermes-travel-agent.vercel.app";
  delete process.env.HERMES_ALLOW_GOOGLE_OAUTH;

  assert.equal(googleAuthUrl("tg:1"), null);
  const setup = getGoogleSetupInfo();
  assert.equal(setup.enabled, false);
  assert.match(setup.disabledReason ?? "", /production-only/i);

  process.env.GOOGLE_CLIENT_ID = prev.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = prev.GOOGLE_CLIENT_SECRET;
  process.env.VERCEL = prev.VERCEL;
  process.env.VERCEL_ENV = prev.VERCEL_ENV;
  process.env.VERCEL_URL = prev.VERCEL_URL;
  process.env.VERCEL_PROJECT_PRODUCTION_URL = prev.VERCEL_PROJECT_PRODUCTION_URL;
  process.env.HERMES_ALLOW_GOOGLE_OAUTH = prev.HERMES_ALLOW_GOOGLE_OAUTH;
});

test("saveGoogleTokens persists OAuth tokens to Mem0 profile", async () => {
  const mem0 = new InMemoryMem0();
  const userId = "tg:42" as const;
  await mem0.saveProfile(emptyProfile(userId, "2026-07-11T00:00:00.000Z"));

  await saveGoogleTokens(userId, "access-abc", "refresh-xyz", mem0);

  const profile = await mem0.getProfile(userId);
  assert.equal(profile?.googleOAuth?.accessToken, "access-abc");
  assert.equal(profile?.googleOAuth?.refreshToken, "refresh-xyz");
  assert.ok(profile?.googleOAuth?.updatedAt);
});

test("redactGoogleOAuth strips tokens from profile responses", () => {
  const profile = emptyProfile("tg:1", "2026-07-11T00:00:00.000Z");
  profile.googleOAuth = {
    accessToken: "secret-access",
    refreshToken: "secret-refresh",
    updatedAt: "2026-07-11T00:00:00.000Z",
  };

  const safe = redactGoogleOAuth(profile);
  assert.equal("googleOAuth" in safe, false);
  assert.equal(safe.userId, "tg:1");
});
