import { test } from "node:test";
import assert from "node:assert/strict";
import { LinkupScout } from "../../src/core/workers/scout.js";
import { emptyProfile } from "../../src/shared/schemas.js";
import { StubLiveTools } from "../../src/tools/index.js";
import { LinkupSearchClient } from "../../src/tools/linkup.js";

test("Linkup client uses bearer authentication and returns search results", async () => {
  let request: RequestInit | undefined;
  const client = new LinkupSearchClient("linkup-key", async (_url, init) => {
    request = init;
    return new Response(JSON.stringify({ results: [{ name: "Venue", url: "https://venue.test" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  assert.deepEqual(await client.search("Lisbon food"), [{ name: "Venue", url: "https://venue.test", content: undefined }]);
  assert.equal((request?.headers as Record<string, string>).Authorization, "Bearer linkup-key");
});

test("Linkup Scout turns live search results into date-spread activity candidates", async () => {
  const scout = new LinkupScout({
    async search() {
      return [{ name: "Time Out Market", url: "https://timeout.test" }, { name: "Alfama walking tour" }];
    },
  });
  const profile = emptyProfile("traveller", "2026-07-11T00:00:00.000Z");
  profile.activities.categories = ["food", "walks"];

  const findings = await scout.find(profile, {
    destination: "Lisbon",
    start: "2026-09-01",
    end: "2026-09-05",
  }, new StubLiveTools());

  assert.deepEqual(findings.options, [
    { kind: "activity", title: "Time Out Market", date: "2026-09-01", location: "Lisbon", sourceUrl: "https://timeout.test" },
    { kind: "activity", title: "Alfama walking tour", date: "2026-09-02", location: "Lisbon" },
  ]);
});
