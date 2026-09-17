// The budget gate (scripts/budget.mjs) and the baseline table generator
// (scripts/measure.mjs) must agree on one set of numbers, so both read them
// from the same place: the `npm run budget` row of docs/baseline.md, which
// carries the measured first-load size and the limit it must stay under.
// A row that is absent or not a passing measurement returns null, and both
// callers fail loudly rather than falling back to a stale constant.
import { readFileSync } from "node:fs";

const BUDGET_ROW =
  /\| `npm run budget` \| Pass, \/ first-load ([\d.]+) kB of (\d+) kB \|/;

/** The first-load size and limit carried by docs/baseline.md's budget row,
 *  or null when the row is absent or not a passing measurement. */
export function readBudgetBaseline(
  doc = readFileSync("docs/baseline.md", "utf8"),
) {
  const row = doc.match(BUDGET_ROW);
  if (!row) return null;
  return { firstLoadKb: Number(row[1]), limitKb: Number(row[2]) };
}
