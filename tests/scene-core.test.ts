import assert from "node:assert/strict";
import { test } from "node:test";
import { softwareRenderer } from "../src/scene/core";

test("softwareRenderer names the software rasterisers and passes real GPUs", () => {
  // The strings come from WEBGL_debug_renderer_info as CI and cheap devices
  // report them; a hardware string must stay on the full path.
  for (const gpu of [
    "SwiftShader",
    "llvmpipe (LLVM 16.0, 256 bits)",
    "softpipe",
    "Software Rasterizer",
  ]) {
    assert.equal(softwareRenderer(gpu), true, `${gpu} is software`);
  }
  for (const gpu of [
    "ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)",
    "Mali-G72",
    "Apple M2",
  ]) {
    assert.equal(softwareRenderer(gpu), false, `${gpu} is hardware`);
  }
  // A blocked or missing debug string must not read as software.
  assert.equal(softwareRenderer(""), false);
});
