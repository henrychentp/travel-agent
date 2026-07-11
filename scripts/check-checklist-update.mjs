import { execFileSync } from "node:child_process";

const base = process.env.CHECKLIST_BASE_REF ?? "HEAD~1";
const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const implementationChanged = changed.some((file) => (
  file.startsWith("src/")
  || file.startsWith("convex/")
  || file.startsWith("workers/")
  || file.startsWith("tests/")
  || ["package.json", "package-lock.json", "tsconfig.json", "wrangler.toml"].includes(file)
));

if (implementationChanged && !changed.includes("BUILDATHON_TODO.md")) {
  console.error("Checklist gate failed: implementation changed without updating BUILDATHON_TODO.md.");
  console.error("Update the relevant checkbox or add a short status note before merging.");
  process.exit(1);
}

console.log(implementationChanged
  ? "Checklist gate passed: implementation and checklist changed together."
  : "Checklist gate passed: no implementation files changed.");
