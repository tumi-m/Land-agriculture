/**
 * The renderer, scene and render-on-demand loop for the exploded model.
 *
 * A map that never moves should not burn a phone battery, so frames are drawn
 * only while something is animating: a tween, an orbit, a resize or a theme
 * flip wake the loop, and it sleeps again once quiet. All three.js setup for
 * lights and the ground lives here; `pieces.ts` builds what stands on it.
 *
 * When the GPU string names a software rasteriser — CI runners, machines with
 * a broken driver, cheap devices — antialiasing and soft shadows multiply the
 * cost of every frame enough to starve the frame scheduler, so they are
 * dropped there and the loop stays awake a little longer after each touch.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SCENE } from "@/design/ramps";
import { readToken, onThemeChange } from "@/lib/tokens";
import { disposeSubtree } from "./pieces";

/** True when the GPU string names a software rasteriser. */
export function softwareRenderer(gpu: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software/i.test(gpu);
}

/** Reads the GPU string before the renderer exists, so antialias can be skipped. */
function gpuString(): string {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!gl) return "";
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = info
    ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return name;
}

export interface SceneCore {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sun: THREE.DirectionalLight;
  /** Keeps drawing for a while, so a tween has frames to run in. */
  wake: () => void;
  /** The current hover highlight colour, refreshed when the theme flips. */
  accent: () => string;
  dispose: () => void;
}

export interface SceneCoreOptions {
  host: HTMLElement;
  /** Called every animated frame, after the controls update, before the draw. */
  onFrame: (delta: number) => void;
  onResize?: () => void;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
}

export function createSceneCore({
  host,
  onFrame,
  onResize,
  fov = 38,
  minDistance = 20,
  maxDistance = 700,
}: SceneCoreOptions): SceneCore | null {
  const software = softwareRenderer(gpuString());
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !software,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.setPixelRatio(software ? 1 : Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    fov,
    host.clientWidth / host.clientHeight,
    0.1,
    1200,
  );
  camera.position.set(0, 110, 135);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.maxPolarAngle = 1.35;
  controls.minPolarAngle = 0.15;
  controls.enablePan = true;

  scene.add(new THREE.HemisphereLight(SCENE.hemiSky, SCENE.hemiGround, 2.2));
  const sun = new THREE.DirectionalLight(SCENE.sun, 3);
  sun.position.set(-60, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -140,
    right: 140,
    top: 140,
    bottom: -140,
    far: 400,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(SCENE.rim, 2);
  rim.position.set(80, 45, -100);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(650, 650),
    new THREE.ShadowMaterial({ opacity: 0.35 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1;
  floor.receiveShadow = true;
  scene.add(floor);

  let accent = readToken("--clay");
  const stopTheme = onThemeChange(() => {
    accent = readToken("--clay");
  });

  let frameHandle = 0;
  let previous = performance.now();
  // Software rendering settles slower per frame, so give interactions there a
  // wider window of live frames to land in.
  const awakeMs = software ? 3000 : 1800;
  let activeUntil = previous + awakeMs;
  const wake = () => {
    activeUntil = performance.now() + awakeMs;
    if (!frameHandle && !document.hidden)
      frameHandle = requestAnimationFrame(tick);
  };

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tick = () => {
    frameHandle = 0;
    const now = performance.now();
    if (document.hidden) return;
    const delta = Math.min((now - previous) / 1000, 0.08);
    previous = now;
    onFrame(reduced ? 1 : Math.min(1, delta * 7));
    controls.update();
    renderer.render(scene, camera);
    if (now <= activeUntil || controls.autoRotate) {
      frameHandle = requestAnimationFrame(tick);
    }
  };

  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
      previous = performance.now();
    } else wake();
  };
  controls.addEventListener("change", wake);
  document.addEventListener("visibilitychange", visibility);

  // One reallocation of the GL surface per real size change; a repeated
  // size (the observer's first fire after the constructor, or a no-op
  // relayout) would rebuild the surface for nothing, and rebuilding it is
  // the one operation software compositing handles worst.
  let sizedW = host.clientWidth;
  let sizedH = host.clientHeight;
  const resize = new ResizeObserver(() => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h || (w === sizedW && h === sizedH)) return;
    sizedW = w;
    sizedH = h;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    onResize?.();
    wake();
  });
  resize.observe(host);
  wake();

  return {
    renderer,
    scene,
    camera,
    controls,
    sun,
    wake,
    accent: () => accent,
    dispose: () => {
      stopTheme();
      cancelAnimationFrame(frameHandle);
      resize.disconnect();
      controls.removeEventListener("change", wake);
      document.removeEventListener("visibilitychange", visibility);
      controls.dispose();
      disposeSubtree(scene);
      sun.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
