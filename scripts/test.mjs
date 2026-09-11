import { build } from "esbuild";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Bundles scripts/test-explorer.tsx plus every tests/**/*.test.{ts,tsx} (the
// walk is recursive), each to its own .cjs, then runs them all with node --test.
// With an argument (`npm test -- format`) only files whose path contains the
// argument are run, for single-file iteration.
async function walk(dir, out) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

const directory = await mkdtemp(join(tmpdir(), "asbonge-tests-"));
try {
  const filter = process.argv[2];
  const entryPoints = ["scripts/test-explorer.tsx"];
  try {
    await walk("tests", entryPoints);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const selected = filter
    ? entryPoints.filter((entry) => entry.includes(filter))
    : entryPoints;
  if (selected.length === 0) {
    console.error(`test: no test file matches "${filter}"`);
    process.exitCode = 1;
  } else {
    const outfiles = [];
    for (const entry of selected) {
      const flat = entry.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-\.tsx?$/g, "");
      const outfile = join(directory, `${flat}.cjs`);
      await build({
        entryPoints: [entry],
        outfile,
        bundle: true,
        platform: "node",
        format: "cjs",
        jsx: "automatic",
        logLevel: "warning",
      });
      outfiles.push(outfile);
    }
    const result = spawnSync(process.execPath, ["--test", ...outfiles], {
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}