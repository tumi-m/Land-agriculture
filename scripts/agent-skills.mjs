// Fetches the motion agent skills this repo works with into .agents/skills,
// each pinned to a commit so every checkout reads the same instructions.
// They are fetched rather than committed: they are other projects' work,
// not all of them carry a licence that allows copying, and they update on
// their own schedule. To move a pin, change the commit here and re-run.
//
// The repo's own skill, .agents/skills/motion-studio, is committed and not
// touched by this script.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCES = [
  { repo: "remotion-dev/skills", commit: "7ba4dcf8ebe1626b00baa41e1f2478113719b60b", from: "skills" },
  { repo: "greensock/gsap-skills", commit: "aed9cfd3277740755f6bfc1155c7aa645403b760", from: "skills" },
  { repo: "motiondivision/ai-kit", commit: "d1c5c26f424adfd47c112d894e9d424b57338c7e", from: "plugins/motion/skills" },
];
const OWN = new Set(["motion-studio"]);
const TARGET = join(process.cwd(), ".agents", "skills");

mkdirSync(TARGET, { recursive: true });
for (const name of readdirSync(TARGET)) {
  if (!OWN.has(name)) rmSync(join(TARGET, name), { recursive: true, force: true });
}

const git = (cwd, ...args) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "inherit"] });
const synced = [];
for (const { repo, commit, from } of SOURCES) {
  const work = mkdtempSync(join(tmpdir(), "skills-"));
  try {
    git(work, "init", "--quiet");
    git(work, "fetch", "--quiet", "--depth", "1", `https://github.com/${repo}.git`, commit);
    git(work, "checkout", "--quiet", "FETCH_HEAD");
    const root = join(work, from);
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !existsSync(join(root, entry.name, "SKILL.md"))) continue;
      if (OWN.has(entry.name)) throw new Error(`${repo} has a skill named ${entry.name}, which this repo owns`);
      cpSync(join(root, entry.name), join(TARGET, entry.name), { recursive: true, dereference: true });
      synced.push({ skill: entry.name, repo, commit });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

writeFileSync(join(TARGET, "synced.json"), `${JSON.stringify(synced, null, 2)}\n`);
console.log(`skills: ${synced.length} skills from ${SOURCES.length} repositories in .agents/skills`);
for (const s of synced) console.log(`  ${s.skill.padEnd(26)} ${s.repo}@${s.commit.slice(0, 7)}`);
