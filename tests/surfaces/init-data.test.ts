import assert from "node:assert/strict";
import test from "node:test";
import { resolveTelegramUser } from "../../src/surfaces/telegram/init-data.js";

const BOT = "123456:ABC-DEF";

test("resolveTelegramUser falls back to unsafe user when initData is invalid", () => {
  const prev = process.env.TELEGRAM_ALLOW_UNSAFE_USER;
  process.env.TELEGRAM_ALLOW_UNSAFE_USER = "true";
  try {
    const user = resolveTelegramUser(
      "query_id=bad&user=%7B%22id%22%3A99%7D&hash=deadbeef",
      BOT,
      { id: 42, first_name: "Alex" },
    );
    assert.equal(user?.id, 42);

    const fromString = resolveTelegramUser("", BOT, { id: "77" as unknown as number, first_name: "Sam" });
    assert.equal(fromString?.id, 77);
  } finally {
    if (prev === undefined) delete process.env.TELEGRAM_ALLOW_UNSAFE_USER;
    else process.env.TELEGRAM_ALLOW_UNSAFE_USER = prev;
  }
});
