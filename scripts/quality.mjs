// Runs the M0.3 quality spec and renders its raw measurements into
// test-results/quality/baseline.json plus the human table in
// docs/map-quality-baseline.md. The harness only measures; QC passes compare
// later numbers against these. This script is a measurement run, not a gate,
// so it exits 0 even when the page has problems — they are the baseline.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = "test-results/quality";

console.log("quality: running e2e/quality.spec.ts (this drives a real browser)");
try {
  execFileSync("npx", ["playwright", "test", "e2e/quality.spec.ts"], {
    stdio: "inherit",
  });
} catch {
  console.error("quality: the spec failed to run; fix the run before trusting any table");
  process.exit(1);
}

const rawPath = join(OUT, "raw.json");
if (!existsSync(rawPath)) {
  console.error(`quality: ${rawPath} was not written; the spec did not produce measurements`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(rawPath, "utf8"));
const states = Object.values(raw);

const KINDS = [
  ["text-overlap", "Overlapping text pairs"],
  ["small-target", "Touch targets < 44 px"],
  ["low-contrast", "Text below WCAG AA"],
  ["missing-name", "Controls without an accessible name"],
  ["unrendered-value", "Cards showing undefined / NaN"],
];

const count = (state, kind) =>
  state.problems.filter((p) => p.kind === kind).length;

// Baseline JSON: one row per state with the counts rolled up, kept beside the
// human table so later QC can diff numbers without parsing markdown.
mkdirSync(OUT, { recursive: true });
const rows = states.map((state) => ({
  state: state.state,
  scheme: state.scheme,
  viewport: `${state.viewport.width}x${state.viewport.height}`,
  overlays: state.overlays.length,
  textOverlaps: count(state, "text-overlap"),
  smallTargets: count(state, "small-target"),
  lowContrast: count(state, "low-contrast"),
  missingNames: count(state, "missing-name"),
  unrendered: count(state, "unrendered-value"),
}));
writeFileSync(
  join(OUT, "baseline.json"),
  JSON.stringify(rows, null, 2),
);

const header = [
  "State",
  "Overlays",
  ...KINDS.map(([, label]) => label),
];
const lines = [
  `# Map quality baseline`,
  ``,
  `Recorded by \`npm run quality\` (M0.3). One row per measured state at`,
  `390x844 and 1440x900 in light and dark: anatomy at four explode depths,`,
  `atlas with the dossier closed, atlas with a notice open. Numbers are the`,
  `fixed QC0 zero point; later "30% fewer" claims are computed from them.`,
  ``,
  `| ${header.join(" | ")} |`,
  `|${header.map(() => "---").join("|")}|`,
  ...rows.map(
    (r) =>
      `| ${r.state} | ${r.overlays} | ${r.textOverlaps} | ${r.smallTargets} | ${r.lowContrast} | ${r.missingNames} | ${r.unrendered} |`,
  ),
  ``,
];
writeFileSync("docs/map-quality-baseline.md", lines.join("\n"));

const totals = {
  overlays: Math.max(...rows.map((r) => r.overlays)),
  textOverlaps: rows.reduce((sum, r) => sum + r.textOverlaps, 0),
  smallTargets: rows.reduce((sum, r) => sum + r.smallTargets, 0),
  lowContrast: rows.reduce((sum, r) => sum + r.lowContrast, 0),
  missingNames: rows.reduce((sum, r) => sum + r.missingNames, 0),
  unrendered: rows.reduce((sum, r) => sum + r.unrendered, 0),
};
console.log(
  `quality: ${rows.length} states -> ${OUT}/baseline.json and docs/map-quality-baseline.md`,
);
console.log(
  `quality: baseline sums ${JSON.stringify(totals)}`,
);
