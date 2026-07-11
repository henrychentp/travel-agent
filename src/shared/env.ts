/** Read required env vars. Use `node --env-file=.env` when starting the app. */

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env, set the key, then run: npm start`,
    );
  }
  return value;
}

export function getOpenAIKey(): string {
  return requireEnv("OPENAI_API_KEY");
}

/** Default model for skills. Override with OPENAI_MODEL in .env. */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
}

/** Richer model for onboarding recaps and in-app copy. */
export function getOnboardingModel(): string {
  return (
    process.env.OPENAI_ONBOARDING_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5.6-sol"
  );
}

export function getTelegramBotToken(): string {
  return requireEnv("TELEGRAM_BOT_TOKEN");
}

/** Public HTTPS URL where the taste-swipe mini app is hosted (must match server). */
export function getWebAppUrl(): string {
  const url = requireEnv("WEBAPP_URL").replace(/\/$/, "");
  return url;
}

export function getServerPort(): number {
  return Number(process.env.PORT ?? "8787");
}

export function getTelegramAllowUnsafeUser(): boolean {
  return process.env.TELEGRAM_ALLOW_UNSAFE_USER === "true";
}

export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim() &&
    process.env.WEBAPP_URL?.trim()
  );
}
