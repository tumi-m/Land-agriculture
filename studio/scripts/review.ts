/**
 * Review: checks the master against the brief, then lays out what a person
 * needs to look at before it ships — a contact sheet, one still per scene,
 * and a report. Exits non-zero when a check fails.
 *
 *   length, size, frame rate, audio   ffprobe
 *   every frame present               Mediabunny reads the container itself
 *                                     and counts the video packets
 *   loudness and true peak            FFmpeg loudnorm, measuring only
 *   black gaps, frozen stretches      FFmpeg blackdetect and freezedetect
 *   empty scenes                      FFmpeg signalstats on each still: a
 *                                     canvas that failed to draw is flat
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";
import { SCENES } from "../src/film/timeline";
import { MASTER, REVIEW, brief, ffmpeg, megabytes, probe } from "./media";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
const checks: Check[] = [];
const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

// The file itself.
const info = probe(MASTER);
const video = info.streams.find((s) => s.codec_type === "video");
const audio = info.streams.find((s) => s.codec_type === "audio");
const seconds = Number(info.format.duration);
check("length", Math.abs(seconds - brief.seconds) < 0.1, `${seconds.toFixed(2)} s (brief: ${brief.seconds} s)`);
check(
  "size",
  video?.width === brief.width && video?.height === brief.height,
  `${video?.width}×${video?.height} (brief: ${brief.width}×${brief.height})`,
);
const [num, den] = (video?.r_frame_rate ?? "0/1").split("/").map(Number);
check("frame rate", num / den === brief.fps, `${(num / den).toFixed(2)} fps (brief: ${brief.fps})`);
check("audio", !!audio, audio ? `${audio.codec_name}, ${audio.sample_rate} Hz, ${audio.channels} ch` : "no audio track");

// A second reading of the container, independent of FFmpeg: one packet per
// frame, so a dropped or doubled frame shows up as a count that is off.
const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(MASTER) });
const track = await input.getPrimaryVideoTrack();
const frames = brief.seconds * brief.fps;
const packets = track ? (await track.computePacketStats()).packetCount : 0;
check("every frame present", packets === frames, `${packets} frames (brief: ${frames}), ${(await track?.getCodec()) ?? "no video"}`);
input.dispose();

// Loudness, measured the way loudnorm would before correcting anything.
const loudLog = ffmpeg(["-i", MASTER, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
const loud = JSON.parse(loudLog.slice(loudLog.lastIndexOf("{"), loudLog.lastIndexOf("}") + 1));
const integrated = Number(loud.input_i);
const truePeak = Number(loud.input_tp);
check(
  "loudness",
  Math.abs(integrated - brief.loudness.integrated) <= brief.loudness.tolerance,
  `${integrated.toFixed(1)} LUFS (brief: ${brief.loudness.integrated} ± ${brief.loudness.tolerance})`,
);
check("true peak", truePeak <= brief.loudness.truePeakMax, `${truePeak.toFixed(1)} dBTP (brief: ≤ ${brief.loudness.truePeakMax})`);

// Black gaps and frozen stretches across the whole cut.
const pictureLog = ffmpeg([
  "-i",
  MASTER,
  "-an",
  "-vf",
  `blackdetect=d=0.25:pix_th=0.06,freezedetect=n=0.0003:d=${brief.review.maxFrozenSeconds}`,
  "-f",
  "null",
  "-",
]);
const black = [...pictureLog.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => `${m[1]}–${m[2]} s`);
check("no black gaps", black.length === 0, black.length ? black.join(", ") : "none");
const frozen = [...pictureLog.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => `from ${Number(m[1]).toFixed(2)} s`);
check(
  `nothing frozen ${brief.review.maxFrozenSeconds} s or more`,
  frozen.length === 0,
  frozen.length ? frozen.join(", ") : "none",
);

// One still per scene, three quarters of the way in, and whether it has
// anything on it: the spread between its darkest and brightest pixels.
for (const [name, scene] of Object.entries(SCENES)) {
  const frame = scene.from + Math.floor(scene.duration * 0.75);
  const file = join(REVIEW, `${name}.png`);
  ffmpeg(["-i", MASTER, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", file]);
  const stats = ffmpeg(["-i", file, "-vf", "signalstats,metadata=print", "-f", "null", "-"]);
  const min = Number(/YMIN=(\d+)/.exec(stats)?.[1] ?? 0);
  const max = Number(/YMAX=(\d+)/.exec(stats)?.[1] ?? 0);
  check(`${name} has a picture`, max - min > 60, `frame ${frame}, luma ${min}–${max}`);
}

// The contact sheet: one frame every N seconds, five across.
const every = brief.review.contactSheetEvery;
const tiles = Math.ceil(brief.seconds / every);
ffmpeg([
  "-i",
  MASTER,
  "-vf",
  `fps=1/${every},scale=384:-1,tile=5x${Math.ceil(tiles / 5)}:padding=4:margin=4`,
  "-frames:v",
  "1",
  join(REVIEW, "contact-sheet.png"),
]);

const failed = checks.filter((c) => !c.ok);
const report = [
  "# Review: launch film",
  "",
  `Master: \`out/launch-master.mp4\`, ${megabytes(MASTER).toFixed(1)} MB.`,
  "",
  "| Check | Result | Detail |",
  "| --- | --- | --- |",
  ...checks.map((c) => `| ${c.name} | ${c.ok ? "pass" : "FAIL"} | ${c.detail} |`),
  "",
  "Look at `contact-sheet.png` and the stills beside it before shipping.",
  "",
].join("\n");
writeFileSync(join(REVIEW, "report.md"), report);
console.log(report);
if (failed.length) {
  console.error(`review: ${failed.length} check(s) failed`);
  process.exit(1);
}
console.log(`review: all ${checks.length} checks pass; contact sheet and stills in ${REVIEW}`);
