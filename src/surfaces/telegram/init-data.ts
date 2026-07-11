import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserId } from "../../shared/schemas.js";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

const RESUME_TTL_MS = 15 * 60 * 1000;

/** Short-lived token so OAuth redirects can restore session without initData. */
export function issueResumeToken(userId: UserId, botToken: string): string {
  const exp = Date.now() + RESUME_TTL_MS;
  const payload = `${userId}:${exp}`;
  const sig = createHmac("sha256", botToken)
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyResumeToken(
  token: string,
  botToken: string,
): UserId | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length < 3) return null;
    const sig = parts.pop()!;
    const expStr = parts.pop()!;
    const userId = parts.join(":");
    if (!userId.startsWith("tg:")) return null;
    if (Date.now() > Number(expStr)) return null;
    const expected = createHmac("sha256", botToken)
      .update(`${userId}:${expStr}`)
      .digest("hex")
      .slice(0, 24);
    if (sig !== expected) return null;
    return userId as UserId;
  } catch {
    return null;
  }
}

function userFromId(userId: UserId): TelegramWebAppUser | null {
  const id = Number(userId.replace(/^tg:/, ""));
  if (!Number.isFinite(id)) return null;
  return { id, first_name: "Traveller" };
}

/** Validate Telegram Mini App initData per official spec. */
export function validateInitData(
  initData: string,
  botToken: string,
): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculated = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculated.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(calculated), Buffer.from(hash));
}

export function parseTelegramUser(initData: string): TelegramWebAppUser | null {
  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    return JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    return null;
  }
}

export function telegramUserId(user: TelegramWebAppUser): string {
  return `tg:${user.id}`;
}

/** Resolve user from signed initData, with optional unsafe fallback for WebApp quirks. */
export function resolveTelegramUser(
  initData: string,
  botToken: string,
  unsafeUser?: TelegramWebAppUser | null,
  resumeToken?: string | null,
): TelegramWebAppUser | null {
  if (initData && validateInitData(initData, botToken)) {
    return parseTelegramUser(initData);
  }
  if (resumeToken) {
    const userId = verifyResumeToken(resumeToken, botToken);
    if (userId) return userFromId(userId);
  }
  if (
    process.env.TELEGRAM_ALLOW_UNSAFE_USER === "true" &&
    unsafeUser?.id
  ) {
    return unsafeUser;
  }
  return null;
}
