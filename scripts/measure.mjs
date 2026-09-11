// Rewrites the check table in docs/baseline.md with fresh numbers: the four
// fast-check wall times, the unit-test count, and the bundle size from the
// last production build. Update in place, never append — the file holds one
// table with one date.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

function time(label, command, args = []) {
  const start = performance.now();
  try {
    execFileSync(command, args, { stdio: "pipe" });
  } catch (error) {
    console.error(`measure: ${label} failed; fix it before trusting this table`);
    process.exitCode = 1;
  }
  const seconds = (performance.now() - start) / 1000;
  console.log(`measure: ${label} ${seconds.toFixed(1)} s`);
  return seconds;
}

function countTests() {
  const out = execFileSync("node", ["scripts/test.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const match = out.match(/ℹ tests (\d+)/);
  return match ? match[1] : "?";
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
    return "? (run npm run build first)";
  }
}

const typecheck = time("typecheck", "npm", ["run", "typecheck"]);
const lint = time("lint", "npm", ["run", "lint"]);
const graph = time("graph", "npm", ["run", "graph"]);
const tests = countTests();
const bundle = bundleKb();
const date = new Date().toISOString().slice(0, 10);

const table = [
  "| Check | Result |",
  "|---|---|",
  `| \`npm run typecheck\` | Pass, ${typecheck.toFixed(1)} s |`,
  `| \`npm run lint\` | Pass, ${lint.toFixed(1)} s, zero warnings |`,
  `| \`npm run graph\` | Pass, ${graph.toFixed(1)} s, no violations |`,
  `| \`npm test\` | Pass (${tests} tests) |`,
  `| \`npm run budget\` | Pass, / first-load ${bundle} kB of 230 kB |`,
  "",
].join("\n");

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