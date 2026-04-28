#!/usr/bin/env node
// Run via `npm run test:fees`. Loads config + tests from disk and exits non-zero
// on any failure — meant for CI on PRs that touch either file.
import { readFileSync } from "node:fs";
import path from "node:path";
import { ServiceFeeConfigSchema } from "../lib/schema";
import { TestFileSchema, runCases } from "../lib/test-runner";

function red(s: string) {
  return `\x1b[31m${s}\x1b[0m`;
}
function green(s: string) {
  return `\x1b[32m${s}\x1b[0m`;
}
function dim(s: string) {
  return `\x1b[2m${s}\x1b[0m`;
}

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "config", "service-fees.json");
const testsPath = path.join(root, "config", "service-fees.test.json");

const config = ServiceFeeConfigSchema.parse(JSON.parse(readFileSync(configPath, "utf8")));
const tests = TestFileSchema.parse(JSON.parse(readFileSync(testsPath, "utf8")));

const results = runCases(config, tests);
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

console.log("\nGolden tests for service-fees.json\n");
for (const r of results) {
  const tag = r.passed ? green("✓ PASS") : red("✗ FAIL");
  console.log(`  ${tag}  ${r.name}`);
  if (!r.passed) {
    console.log(
      dim(`         expected ${r.expected.toFixed(2)} ${r.currency}, got ${r.actual.toFixed(2)} ${r.currency} (${r.source})`)
    );
    console.log(dim(`         ${r.explanation}`));
  }
}
console.log();
console.log(`  ${passed}/${results.length} passed`);
console.log();

if (failed.length > 0) process.exit(1);
