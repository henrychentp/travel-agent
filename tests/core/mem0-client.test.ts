import { test } from "node:test";
import assert from "node:assert/strict";
import { HostedMem0Client } from "../../src/shared/mem0-client.js";
import { emptyProfile } from "../../src/shared/schemas.js";

test("hosted Mem0 saves structured profile verbatim with infer disabled", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mem0 = new HostedMem0Client("mem0-key", async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/v1/event/")) {
      return new Response(JSON.stringify({ status: "SUCCEEDED" }), { status: 200 });
    }
    if (String(url).includes("/memories/add/")) {
      return new Response(
        JSON.stringify({ status: "PENDING", event_id: "evt-test" }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  });
  const profile = emptyProfile("tg:42", "2026-07-11T00:00:00.000Z");
  profile.destinationCity = "Barcelona";
  profile.notes.push("prefers quiet hotels");

  await mem0.saveProfile(profile);

  const addCall = calls.find((c) => c.url.includes("/memories/add/"));
  assert.ok(addCall);
  assert.equal(addCall?.url, "https://api.mem0.ai/v3/memories/add/");
  assert.equal(
    (addCall?.init?.headers as Record<string, string>).Authorization,
    "Token mem0-key",
  );
  const body = JSON.parse(String(addCall?.init?.body)) as {
    infer: boolean;
    metadata: Record<string, string>;
    messages: { content: string }[];
  };
  assert.equal(body.infer, false);
  assert.equal(body.metadata.hermes_type, "profile");
  assert.ok(body.messages[0]);
  assert.match(body.messages[0].content, /hermes_profile/);
  assert.ok(calls.some((c) => c.url.includes("/v1/event/evt-test")));
});

test("hosted Mem0 loads latest structured profile memory for user", async () => {
  const profile = emptyProfile("tg:99", "2026-07-11T00:00:00.000Z");
  profile.destinationCity = "Tokyo";
  const mem0 = new HostedMem0Client("mem0-key", async (url) => {
    if (String(url).includes("/memories/?")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              memory: `hermes_profile:${JSON.stringify({ ...profile, destinationCity: "Paris" })}`,
              created_at: "2026-07-10T00:00:00.000Z",
            },
            {
              memory: `hermes_profile:${JSON.stringify(profile)}`,
              created_at: "2026-07-11T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ status: "SUCCEEDED" }), { status: 200 });
  });

  const loaded = await mem0.getProfile("tg:99");
  assert.equal(loaded?.destinationCity, "Tokyo");
});
