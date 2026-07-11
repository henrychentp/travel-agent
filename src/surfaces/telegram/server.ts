/**
 * Hermes Telegram bot + Mini App server (local dev).
 *
 *   npm run telegram
 *
 * Production: deploy to Vercel (webhook mode, no tunnels).
 */

import { createServer } from "node:http";
import {
  getServerPort,
  getTelegramAllowUnsafeUser,
  getWebAppUrl,
  isGoogleConfigured,
  useTelegramWebhook,
} from "../../shared/env.js";
import { handleHttpRequest, registerTelegramWebhook } from "./http-handler.js";
import { pollTelegram, syncTelegramMenuButton, tgApi } from "./telegram-bot.js";

const server = createServer((req, res) => {
  void handleHttpRequest(req, res);
});

const port = getServerPort();
server.listen(port, "0.0.0.0", () => {
  void (async () => {
    console.log(`Hermes server  http://0.0.0.0:${port}`);
    console.log(`Mini App URL   ${getWebAppUrl()}`);
    console.log(`Unsafe user    ${getTelegramAllowUnsafeUser() ? "enabled" : "disabled"}`);
    console.log(`Google OAuth   ${isGoogleConfigured() ? "configured" : "NOT SET"}`);
    try {
      if (useTelegramWebhook()) {
        await registerTelegramWebhook();
        console.log(`Telegram bot   webhook mode`);
      } else {
        await tgApi("deleteWebhook", { drop_pending_updates: true });
        console.log(`Telegram bot   polling (local dev)`);
        pollTelegram();
      }
      await syncTelegramMenuButton();
    } catch (err) {
      console.warn("Telegram setup error:", err);
    }
  })();
});
