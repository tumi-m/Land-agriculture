// Rewrites the check table in docs/baseline.md with fresh numbers when every
// check passes: the four fast-check wall times, the unit-test count, and the
// bundle size from the last production build. A failed check renders as Fail
// and stops the rewrite, so a broken run can never record itself as a pass.
// Update in place, never append — the file holds one table with one date.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { readBudgetBaseline } from "./budget-baseline.mjs";

function time(label, command, args = []) {
  const start = performance.now();
  let ok = true;
  try {
    execFileSync(command, args, { stdio: "pipe" });
  } catch {
    ok = false;
  }
  const seconds = (performance.now() - start) / 1000;
  console.log(`measure: ${label} ${ok ? "pass" : "FAIL"} ${seconds.toFixed(1)} s`);
  return { seconds, ok };
}

function countTests() {
  let out = "";
  let ran = true;
  try {
    out = execFileSync("node", ["scripts/test.mjs"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    ran = false;
  }
  const match = out.match(/ℹ tests (\d+)/);
  return { count: match ? match[1] : "?", ok: ran && match !== null };
}

function bundleKb() {
  try {
    const manifest = JSON.parse(
      readFileSync(".next/app-build-manifest.json", "utf8"),
    );
    const entry = manifest.pages?.["/page"] ?? manifest.pages?.["/"];
    let total = 0;
    for (const file of entry) {
      total += gzipSync(readFileSync(join(".next", file))).length;
    }
    return (total / 1024).toFixed(1);
  } catch {
    return null;
  }
}

// The budget gate itself, against the last build: it exits non-zero when the
// bundle is over the limit carried by docs/baseline.md's budget row, or when
// there is no build to measure.
function budgetPassed() {
  try {
    execFileSync("node", ["scripts/budget.mjs"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const typecheck = time("typecheck", "npm", ["run", "typecheck"]);
const lint = time("lint", "npm", ["run", "lint"]);
const graph = time("graph", "npm", ["run", "graph"]);
const tests = countTests();
const size = bundleKb();
const budget = budgetPassed();
// Read before any rewrite: the new row carries the limit the old one did.
const limit = readBudgetBaseline()?.limitKb ?? null;
const date = new Date().toISOString().slice(0, 10);

const budgetRow =
  size === null
    ? "| `npm run budget` | n/a, run npm run build first |"
    : `| \`npm run budget\` | ${budget ? "Pass" : "Fail"}, / first-load ${size} kB of ${limit ?? "?"} kB |`;

const table = [
  "| Check | Result |",
  "|---|---|",
  `| \`npm run typecheck\` | ${typecheck.ok ? "Pass" : "Fail"}, ${typecheck.seconds.toFixed(1)} s |`,
  `| \`npm run lint\` | ${lint.ok ? "Pass" : "Fail"}, ${lint.seconds.toFixed(1)} s${lint.ok ? ", zero warnings" : ""} |`,
  `| \`npm run graph\` | ${graph.ok ? "Pass" : "Fail"}, ${graph.seconds.toFixed(1)} s${graph.ok ? ", no violations" : ""} |`,
  `| \`npm test\` | ${tests.ok ? `Pass (${tests.count} tests)` : "Fail"} |`,
  budgetRow,
  "",
].join("\n");

const allPassed = typecheck.ok && lint.ok && graph.ok && tests.ok && budget && size !== null;
if (!allPassed) {
  console.error("measure: a check failed; docs/baseline.md is left untouched");
  console.log(table);
  process.exit(1);
}

const path = "docs/baseline.md";
const doc = readFileSync(path, "utf8");
// The check table starts at the first "| Check |" line and ends at the first
// blank line after it.
const updated = doc.replace(
  /\| Check \| Result \|\n(?:\|.*\|\n)+/,
  table,
);
if (updated === doc) {
  console.error("measure: could not find the check table in docs/baseline.md");
  process.exit(1);
}
writeFileSync(
  path,
  updated.replace(
    /^# Baseline \([^)]*\)/m,
    `# Baseline (measured ${date})`,
  ),
);
console.log(`measure: wrote ${path}`);
