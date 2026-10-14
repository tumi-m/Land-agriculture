/**
 * Ship: the deliverables, encoded from the reviewed master.
 *
 *   launch.mp4        H.264 + AAC, fast start, for anywhere
 *   launch-720p.mp4   the same at 720p, for phones and messaging
 *   launch.webm       VP9 + Opus, for the web
 *   poster.jpg        the frame the brief names
 *
 * Each is probed after encoding and checked against the brief's size cap.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MASTER, REVIEW, SHIP, brief, ffmpeg, megabytes, probe } from "./media";

if (!existsSync(join(REVIEW, "report.md"))) {
  console.error("ship: run `npm run review` first");
  process.exit(1);
}

const h264 = ["-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "160k"];
/** `brief` names the entry in the brief's deliverables that caps its size. */
const jobs: { name: string; brief: string; args: string[] }[] = [
  { name: "launch.mp4", brief: "mp4", args: [...h264, "-crf", "22"] },
  { name: "launch-720p.mp4", brief: "mp4-720p", args: ["-vf", "scale=-2:720:flags=lanczos", ...h264, "-crf", "24"] },
  {
    name: "launch.webm",
    brief: "webm",
    args: ["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-c:a", "libopus", "-b:a", "128k"],
  },
];

const rows: string[] = [];
let over = 0;
for (const job of jobs) {
  const file = join(SHIP, job.name);
  ffmpeg(["-i", MASTER, ...job.args, file]);
  const info = probe(file);
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const mb = megabytes(file);
  const cap = brief.deliverables[job.brief]?.maxMB;
  if (cap && mb > cap) over++;
  rows.push(
    `${job.name.padEnd(17)} ${v?.codec_name}/${a?.codec_name} ${v?.width}×${v?.height} ${Number(info.format.duration).toFixed(2)} s ${mb.toFixed(1)} MB${cap ? ` (cap ${cap} MB)` : ""}`,
  );
}

const poster = brief.deliverables.poster?.frame ?? 0;
ffmpeg(["-i", MASTER, "-vf", `select=eq(n\\,${poster})`, "-frames:v", "1", "-q:v", "2", join(SHIP, "poster.jpg")]);
rows.push(`poster.jpg        frame ${poster}`);

console.log(rows.join("\n"));
if (over) {
  console.error(`ship: ${over} file(s) over the brief's size cap`);
  process.exit(1);
}
console.log(`ship: deliverables in ${SHIP}`);
