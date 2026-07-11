#!/usr/bin/env node
/**
 * Block commits that include API keys or .env files.
 * Run via the .githooks/pre-commit hook or: npm run check-secrets
 */

import { execSync } from "node:child_process";

const SECRET_PATTERNS = [
  /sk-proj-[A-Za-z0-9_-]{20,}/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /OPENAI_API_KEY\s*=\s*\S+/,
  /MEM0_API_KEY\s*=\s*\S+/,
  /Bearer\s+sk-/,
];

function stagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  }).trim();
  return out ? out.split("\n") : [];
}

const files = stagedFiles();
let failed = false;

for (const file of files) {
  if (file === ".env" || file === ".env.local") {
    console.error(`✗ Refusing to commit ${file} — use .env.example instead.`);
    failed = true;
    continue;
  }
  if (file.startsWith(".env.") && file !== ".env.example") {
    console.error(`✗ Refusing to commit ${file} — env files stay local.`);
    failed = true;
  }
}

for (const file of files) {
  if (file === ".env.example") continue;

  let content;
  try {
    content = execSync(`git show :${file}`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    continue;
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`✗ Possible secret in staged file: ${file}`);
      console.error("  Remove the key and keep it in your local .env only.");
      failed = true;
      break;
    }
  }
}

if (failed) process.exit(1);
console.log("✓ No secrets detected in staged files.");
