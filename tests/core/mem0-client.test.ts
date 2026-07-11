import { test } from "node:test";
import assert from "node:assert/strict";
import { HostedMem0Client } from "../../src/shared/mem0-client.js";
import { emptyProfile } from "../../src/shared/schemas.js";

test("hosted Mem0 saves a structured profile with Token authentication", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mem0 = new HostedMem0Client("mem0-key", async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ status: "PENDING" }), { status: 200 });
  });
  const profile = emptyProfile("henry", "2026-07-11T00:00:00.000Z");
  profile.notes.push("prefers quiet hotels");

  await mem0.saveProfile(profile);

  assert.equal(calls[0]?.url, "https://api.mem0.ai/v3/memories/add/");
  assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, "Token mem0-key");
  assert.match(String(calls[0]?.init?.body), /hermes_profile/);
});
