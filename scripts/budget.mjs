// Bundle budget gate. Runs after `npm run build` (see the `budget` script).
// Fails if the first-load JS of `/` grows past the limit recorded in
// docs/baseline.md's `npm run budget` row (the measured baseline plus 15%).
// The limit is read from the same row `npm run measure` rewrites, so the
// gate and the table can never disagree.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { readBudgetBaseline } from "./budget-baseline.mjs";

const baseline = readBudgetBaseline();
if (!baseline) {
  console.error(
    "budget: docs/baseline.md's `npm run budget` row does not carry a passing " +
      "measurement (| `npm run budget` | Pass, / first-load X kB of Y kB |). " +
      "Run npm run measure after a build to record one.",
  );
  process.exit(1);
}
const LIMIT_KB = baseline.limitKb;

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
      "If the growth is intended, raise the `of Y kB` limit in the `npm run budget` " +
      "row of docs/baseline.md (keep it at the recorded baseline + 15%) and " +
      "re-run `npm run measure`.",
  );
  process.exit(1);
}
