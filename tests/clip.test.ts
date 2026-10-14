import assert from "node:assert/strict";
import { test } from "node:test";
import { CLIP, clipFileName, orbitAngle, withAlpha, wrapLines } from "../src/scene/clip";

/** A saved clip is a loop people share, so its path and its caption are pinned. */

test("the clip turns exactly once and ends where it began", () => {
  const frames = CLIP.fps * CLIP.seconds;
  assert.equal(orbitAngle(0, frames), 0);
  assert.equal(orbitAngle(frames, frames), Math.PI * 2);
  // Frame `frames` is never drawn, so the loop does not repeat its first frame.
  assert.ok(orbitAngle(frames - 1, frames) < Math.PI * 2);
  const step = orbitAngle(1, frames);
  for (let i = 1; i < frames; i++) {
    assert.ok(Math.abs(orbitAngle(i, frames) - orbitAngle(i - 1, frames) - step) < 1e-12);
  }
});

test("a clip is named after the place it shows", () => {
  assert.equal(clipFileName("KwaZulu-Natal · uMkhanyakude", ".mp4"), "asbonge-kwazulu-natal-umkhanyakude.mp4");
  assert.equal(clipFileName("Limpopo", ".webm"), "asbonge-limpopo.webm");
  assert.equal(clipFileName("  ", ".webm"), "asbonge-south-africa.webm");
});

test("caption lines fit the width and say when they were cut", () => {
  const measure = (s: string) => s.length * 10;
  assert.deepEqual(wrapLines("one two three", 200, measure, 2), ["one two three"]);
  assert.deepEqual(wrapLines("aaaa bbbb cccc", 90, measure, 2), ["aaaa bbbb", "cccc"]);
  const cut = wrapLines("aaaa bbbb cccc dddd eeee", 90, measure, 2);
  assert.equal(cut.length, 2);
  assert.ok(cut[1].endsWith("…"));
  assert.ok(cut.every((l) => measure(l) <= 90));
});

test("the caption shade is the stage colour with an alpha", () => {
  assert.equal(withAlpha("#0b1f27", 0.5), "rgba(11, 31, 39, 0.5)");
});
