// Runs the declared build-time pipelines in topological order, skipping a
// node whose inputs and outputs are unchanged since its last run. The DAG
// lives in scripts/pipelines.json: nodes name a command plus its input and
// output files, edges name "after" dependencies. Today's two pipelines are
// independent; the P2 raster → stats → district-stats chain plugs in here.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

const CACHE_DIR = ".pipeline-cache";
const MANIFEST = `${CACHE_DIR}/manifest.json`;

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function order(nodes, edges) {
  const done = new Set();
  const result = [];
  const pending = new Map(Object.entries(nodes));
  while (pending.size > 0) {
    let progressed = false;
    for (const [name, node] of pending) {
      const deps = edges
        .filter((edge) => edge.to === name)
        .map((edge) => edge.from);
      if (deps.every((dep) => done.has(dep))) {
        result.push([name, node]);
        pending.delete(name);
        done.add(name);
        progressed = true;
      }
    }
    if (!progressed) {
      const stuck = [...pending.keys()].join(", ");
      throw new Error(`pipeline: dependency cycle or unknown node in: ${stuck}`);
    }
  }
  return result;
}

const { nodes, edges } = JSON.parse(
  readFileSync("scripts/pipelines.json", "utf8"),
);
let manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  manifest = {};
}

let ran = 0;
for (const [name, node] of order(nodes, edges)) {
  const inputHashes = Object.fromEntries(
    node.inputs.map((file) => [file, hashFile(file)]),
  );
  const outputsPresent = node.outputs.every((file) => existsSync(file));
  const outputHashes = outputsPresent
    ? Object.fromEntries(node.outputs.map((file) => [file, hashFile(file)]))
    : null;
  const recorded = manifest[name];
  const unchanged =
    recorded &&
    outputsPresent &&
    JSON.stringify(recorded.inputs) === JSON.stringify(inputHashes) &&
    JSON.stringify(recorded.outputs) === JSON.stringify(outputHashes);
  if (unchanged) {
    console.log(`pipeline: ${name} skipped (inputs unchanged)`);
    continue;
  }
  console.log(`pipeline: ${name} running: ${node.command.join(" ")}`);
  const result = spawnSync(node.command[0], node.command.slice(1), {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`pipeline: ${name} failed with exit ${result.status}`);
    process.exit(result.status ?? 1);
  }
  ran += 1;
  manifest[name] = {
    inputs: Object.fromEntries(
      node.inputs.map((file) => [file, hashFile(file)]),
    ),
    outputs: Object.fromEntries(
      node.outputs.map((file) => [file, hashFile(file)]),
    ),
    ranAt: new Date().toISOString(),
  };
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`pipeline: done, ${ran} ran, ${Object.keys(nodes).length - ran} skipped`);