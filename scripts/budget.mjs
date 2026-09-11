// Bundle budget gate. Runs after `npm run build` (see the `budget` script).
// Fails if the first-load JS of `/` grows past the limit below. The baseline
// table lives in docs/baseline.md; the limit is the baseline plus 15%.
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

// Baseline (docs/baseline.md, 11 Sep 2026): 200 kB first-load JS for `/`.
// Limit = baseline + 15%.
const LIMIT_KB = 230;

const manifest = JSON.parse(
  readFileSync(".next/app-build-manifest.json", "utf8"),
);
const entry = manifest.pages?.["/page"] ?? manifest.pages?.["/"];
if (!entry || entry.length === 0) {
  console.error(
    "budget: could not find the client entry for `/` in .next/app-build-manifest.json",
  );
  process.exit(1);
}

let total = 0;
for (const file of entry) {
  total += gzipSync(readFileSync(join(".next", file))).length;
}

const kb = total / 1024;
console.log(`budget: / first-load JS ${kb.toFixed(1)} kB (gzip) of ${LIMIT_KB} kB limit`);

if (kb > LIMIT_KB) {
  console.error(
    `budget: / is over its limit by ${(kb - LIMIT_KB).toFixed(1)} kB. ` +
      "If the growth is intended, raise LIMIT_KB in scripts/budget.mjs " +
      "and record the new baseline in docs/baseline.md.",
  );
  process.exit(1);
}