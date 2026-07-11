import { test } from "node:test";
import assert from "node:assert/strict";
import { FinalTripDelivery } from "../../src/output/final-trip-delivery.js";
import { emptyProfile, type TripPlan } from "../../src/shared/schemas.js";

const plan: TripPlan = { tripId: "paris", userId: "henry", request: { destination: "Paris", startDate: "2026-09-11", endDate: "2026-09-13", travellers: 1 }, itinerary: [{ date: "2026-09-11", items: [{ kind: "activity", title: "Louvre", date: "2026-09-11" }] }], version: 1, createdAt: "2026-07-11" };

test("final delivery waits for finalisation, then sends PDF and ElevenLabs voice", async () => {
  const calls: string[] = [];
  const delivery = new FinalTripDelivery({
    tourGuide: { async narrate() { calls.push("tour-guide"); return "Welcome to Paris."; } },
    pdf: { async render() { calls.push("pdf"); return new Uint8Array([1]); } },
    voice: { async synthesize() { calls.push("voice"); return new Uint8Array([2]); } },
    telegram: { async sendPdf() { calls.push("telegram-pdf"); }, async sendVoice() { calls.push("telegram-voice"); } },
  });
  await assert.rejects(() => delivery.deliver("researching", plan, emptyProfile("henry", "2026-07-11")), /only after/);
  await delivery.deliver("finalized", plan, emptyProfile("henry", "2026-07-11"));
  assert.deepEqual(calls, ["tour-guide", "pdf", "voice", "telegram-pdf", "telegram-voice"]);
});
