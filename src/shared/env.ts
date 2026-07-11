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
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra";
}
