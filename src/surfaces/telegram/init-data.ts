import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
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
