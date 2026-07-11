import { test } from "node:test";
import assert from "node:assert/strict";
import { Director, type Intent } from "../../src/core/director.js";
import { Hermes } from "../../src/orchestrator/index.js";
import {
  BoardTripStartLinkIssuer,
  handoffBoardTripStart,
  InvalidTripStartLinkError,
  TelegramTripStartReceiver,
} from "../../src/surfaces/telegram-trip-start.js";

class RecordingDirector extends Director {
  intents: Intent[] = [];

  override async plan(...args: Parameters<Director["plan"]>) {
    this.intents.push(args[2]);
    return super.plan(...args);
  }
}

test("Board's one-time Telegram link reaches the existing Director once", async () => {
  const director = new RecordingDirector({
    now: () => "2026-07-11T00:00:00.000Z",
  });
  const hermes = new Hermes({
    director,
    now: () => "2026-07-11T00:00:00.000Z",
  });
  const receiver = new TelegramTripStartReceiver(hermes);
  const links = new BoardTripStartLinkIssuer(
    "https://t.me/hermes_test_bot",
    () => "trip-start-token",
  );
  const start = {
    handoffId: "board-trip-42",
    userId: "henry",
    request: {
      destination: "Lisbon",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      travellers: 1,
    },
  };

  const link = links.issue(start);
  assert.equal(link.url, "https://t.me/hermes_test_bot?start=trip-start-token");
  assert.strictEqual(links.issue(start), link, "the Board issues one link per action");

  const telegramMessage = links.redeem("trip-start-token");
  const [first, redelivery] = await Promise.all([
    receiver.receive(telegramMessage),
    receiver.receive(telegramMessage),
  ]);

  assert.equal(first.tripId, "henry-Lisbon");
  assert.strictEqual(redelivery, first);
  assert.equal(director.intents.length, 1);
  assert.deepEqual(director.intents[0], {
    kind: "full-plan",
    tripId: "henry-Lisbon",
    userId: "henry",
    request: start.request,
  });

  assert.throws(
    () => links.redeem("trip-start-token"),
    InvalidTripStartLinkError,
  );
});
