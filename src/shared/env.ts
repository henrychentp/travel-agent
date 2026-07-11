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

/** Resolve public HTTPS base URL (mini app + OAuth). */
export function resolvePublicBaseUrl(): string | null {
  // On Vercel, platform-injected domains beat WEBAPP_URL (often a stale local tunnel).
  if (process.env.VERCEL === "1") {
    const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelProd) return `https://${vercelProd.replace(/\/$/, "")}`;

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  }

  const explicit = process.env.WEBAPP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) return `https://${railway.replace(/\/$/, "")}`;

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd.replace(/\/$/, "")}`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  const render = process.env.RENDER_EXTERNAL_URL?.trim();
  if (render) return render.replace(/\/$/, "");

  return null;
}

/** Public HTTPS URL where the taste-swipe mini app is hosted. */
export function getWebAppUrl(): string {
  const url = resolvePublicBaseUrl();
  if (!url) {
    throw new Error(
      "Missing WEBAPP_URL. Set it in .env for local dev, or deploy to Railway/Render/Vercel which inject a public domain.",
    );
  }
  return url;
}

export function useTelegramWebhook(): boolean {
  return (
    process.env.TELEGRAM_USE_WEBHOOK === "true" || process.env.VERCEL === "1"
  );
}

export function getServerPort(): number {
  return Number(process.env.PORT ?? "8787");
}

export function getTelegramAllowUnsafeUser(): boolean {
  return process.env.TELEGRAM_ALLOW_UNSAFE_USER === "true";
}

/** True when hosted Mem0 is configured (otherwise the in-memory stub is used). */
export function isMem0Configured(): boolean {
  return Boolean(process.env.MEM0_API_KEY?.trim());
}

export function isGoogleConfigured(): boolean {
  try {
    return !!(
      process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      resolvePublicBaseUrl()
    );
  } catch {
    return false;
  }
}
