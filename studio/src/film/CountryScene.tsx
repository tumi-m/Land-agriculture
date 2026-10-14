/**
 * The country assembles: nine provinces fall onto the floor and settle.
 *
 * Layers used here, each for one job:
 *   React Three Fiber   the scene as React (through Remotion's ThreeCanvas)
 *   React Three Rapier  the fall and the settle — real rigid bodies, stepped
 *                       once per video frame so every render is identical
 *   Drei                the camera, the province names, the outlines, the floor grid
 *   Postprocessing      bloom on the edges, depth of field, a vignette
 *
 * Remotion forbids animation on a wall clock. The physics world is paused
 * and advanced here, frame by frame, from a snapshot of its first state, so a
 * frame renders the same whether it is the first a tab draws or the last.
 */
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type EffectComposer as Composer, ToneMappingMode } from "postprocessing";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { CuboidCollider, Physics, RigidBody, interactionGroups, useRapier } from "@react-three/rapier";
import { Edges, Grid, PerspectiveCamera, Text } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { SLABS, SLAB_DEPTH } from "./country";
import { COUNTS, SOURCES } from "./data";
import { FPS } from "./timeline";
import { PALETTE } from "./theme";
import { FONTS, fontFiles } from "../lib/fonts";

const STEP = 1 / FPS;
/** Provinces collide with the floor, never with each other: they are tiles. */
const FLOOR = interactionGroups(0, [1]);
const PIECES = interactionGroups(1, [0]);

/** West to east, the order they fall in. */
const ORDER = [...SLABS].sort((a, b) => a.x - b.x).map((s) => s.code);
const dropHeight = (code: string) => 34 + ORDER.indexOf(code) * 7;
/** Landing frame, from the drop height and the scene's gravity. */
const GRAVITY = 60;
const landsAt = (code: string) => Math.round(Math.sqrt((2 * dropHeight(code)) / GRAVITY) * FPS);

/** Gauteng: too small to carry its name, which is set just south of it. */
const isSmall = (s: (typeof SLABS)[number]) => s.size.x * s.size.z < 150;

/** A small, repeatable tilt per province: sin of its index, not a random draw. */
const tilt = (i: number): [number, number, number] => [Math.sin(i * 1.7) * 0.18, 0, Math.cos(i * 2.3) * 0.18];

/**
 * Two things finish a render or two after the scene first commits: the hull
 * colliders, which are computed from the meshes once they mount, and the
 * effect composer, which adds its passes a render after it is built. The
 * world cannot be stepped before the first, nor drawn before the second, and
 * with Remotion drawing only on request nothing would try again.
 */
const COLLIDERS = SLABS.length + 1;
const composerReady = (composer: Composer | null | undefined) => !!composer && composer.passes.length > 1;

function Driver({ frame, composer }: { frame: number; composer: RefObject<Composer | null> }) {
  const { world, step, rapier, setWorld } = useRapier();
  const { advance, camera } = useThree();
  const { delayRender, continueRender } = useDelayRender();
  const sim = useRef<{ snapshot: Uint8Array | null; at: number }>({ snapshot: null, at: 0 });
  const hold = useRef<number | null>(null);

  // Hold the frame from the moment it is committed until the world has been
  // stepped to it and drawn: the canvas's own draw can run before this.
  useLayoutEffect(() => {
    hold.current = delayRender(`Stepping physics to frame ${frame}`);
    return () => {
      if (hold.current !== null) continueRender(hold.current);
      hold.current = null;
    };
  }, [frame, delayRender, continueRender]);

  useEffect(() => {
    // Waiting on the browser's frame callback is a wait, not an animation:
    // what is drawn depends only on the frame number.
    let wait = 0;
    const run = () => {
      if (world.colliders.len() < COLLIDERS || !composerReady(composer.current)) {
        wait = requestAnimationFrame(run);
        return;
      }
      const s = sim.current;
      if (!s.snapshot) {
        s.snapshot = world.takeSnapshot();
        s.at = 0;
      } else if (frame < s.at) {
        // Scrubbing back: start again from the first state. The new world
        // re-runs this effect, which steps it forward.
        setWorld(rapier.World.restoreSnapshot(s.snapshot));
        s.at = 0;
        return;
      }
      while (s.at < frame) {
        step(STEP);
        s.at++;
      }
      // A zero step steps nothing but copies body positions onto the meshes.
      step(0);

      // The camera glides down and round to the three-quarter view the app opens on.
      const t = interpolate(frame, [0, 240], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
      const azimuth = THREE.MathUtils.lerp(-0.55, 0.05, t);
      const distance = THREE.MathUtils.lerp(330, 175, t);
      const elevation = THREE.MathUtils.lerp(1.05, 0.68, t);
      camera.position.set(
        Math.sin(azimuth) * Math.cos(elevation) * distance,
        Math.sin(elevation) * distance,
        Math.cos(azimuth) * Math.cos(elevation) * distance,
      );
      // Aimed a little south of the middle, so the country sits above the caption.
      camera.lookAt(0, 2, 16);
      advance(performance.now());
      if (hold.current !== null) {
        continueRender(hold.current);
        hold.current = null;
      }
    };
    run();
    return () => cancelAnimationFrame(wait);
  }, [frame, world, step, rapier, setWorld, camera, advance, continueRender, composer]);
  return null;
}

/**
 * Drei Text typesets in a worker; hold the frame until it has, then draw
 * again. The hold is taken in a layout effect, which only runs for a
 * committed render: Text suspends while its font loads, and a hold taken
 * during a render React then discards would never be released.
 */
function Label({
  children,
  position,
  opacity,
  size,
}: {
  children: string;
  position: [number, number, number];
  opacity: number;
  size: number;
}) {
  const { delayRender, continueRender } = useDelayRender();
  const advance = useThree((state) => state.advance);
  const state = useRef<{ hold: number | null; synced: boolean }>({ hold: null, synced: false });
  useLayoutEffect(() => {
    const s = state.current;
    if (!s.synced) s.hold = delayRender(`Typesetting ${children}`);
    return () => {
      if (s.hold !== null) continueRender(s.hold);
      s.hold = null;
    };
  }, [children, delayRender, continueRender]);
  return (
    <Text
      font={fontFiles.display600}
      fontSize={size}
      color={PALETTE.ink}
      anchorX="center"
      anchorY="bottom"
      position={position}
      rotation={[-0.75, 0, 0]}
      fillOpacity={opacity}
      outlineWidth={0.12}
      outlineColor={PALETTE.stageBottom}
      outlineOpacity={opacity * 0.8}
      onSync={() => {
        const s = state.current;
        s.synced = true;
        if (s.hold === null) return;
        // The frame was drawn before the glyphs were ready: draw it again.
        advance(performance.now());
        continueRender(s.hold);
        s.hold = null;
      }}
    >
      {children}
    </Text>
  );
}

function Stage({ frame }: { frame: number }) {
  const composer = useRef<Composer | null>(null);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.land, roughness: 0.62, metalness: 0.08 }),
    [],
  );
  return (
    <>
      <PerspectiveCamera makeDefault fov={30} near={1} far={2000} position={[0, 200, 260]} />
      <color attach="background" args={[PALETTE.stageBottom]} />
      <fog attach="fog" args={[PALETTE.stageBottom, 260, 560]} />
      <hemisphereLight args={["#d8fff1", "#35424d", 1.6]} />
      <directionalLight
        position={[-90, 160, 70]}
        intensity={2.6}
        color="#fff4db"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[110, 60, -120]} intensity={1.2} color="#73dbe0" />
      <Grid
        position={[0, 0.01, 0]}
        args={[600, 600]}
        cellSize={10}
        cellThickness={0.6}
        cellColor={PALETTE.grid}
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#36606a"
        fadeDistance={420}
        fadeStrength={1.5}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.02, 0]}>
        <planeGeometry args={[600, 600]} />
        <shadowMaterial opacity={0.38} />
      </mesh>
      <Physics paused interpolate={false} timeStep={STEP} gravity={[0, -GRAVITY, 0]}>
        {/* Deep, so a slab arriving at 100 units a second cannot pass through
            it between two steps. */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[300, 50, 300]} position={[0, -50, 0]} collisionGroups={FLOOR} />
        </RigidBody>
        {SLABS.map((s, i) => (
          <RigidBody
            key={s.code}
            colliders="hull"
            ccd
            collisionGroups={PIECES}
            position={[s.x, dropHeight(s.code), s.z]}
            rotation={tilt(i)}
            enabledTranslations={[false, true, false]}
            enabledRotations={[true, false, true]}
            restitution={0.3}
            friction={0.9}
            angularDamping={0.9}
          >
            <mesh geometry={s.geometry} material={material} castShadow receiveShadow>
              <Edges threshold={25} color={PALETTE.accent} />
            </mesh>
          </RigidBody>
        ))}
        {/* Last, so its effect runs after the bodies above have been created. */}
        <Driver frame={frame} composer={composer} />
      </Physics>
      {SLABS.map((s) => (
        <Label
          key={s.code}
          size={isSmall(s) ? 2.2 : 3}
          position={
            isSmall(s)
              ? [s.x, SLAB_DEPTH + 1.5, s.z + s.size.z / 2 + 3]
              : [s.label.x, SLAB_DEPTH + 1.5, s.label.z]
          }
          opacity={interpolate(frame, [landsAt(s.code) + 30, landsAt(s.code) + 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          {s.name}
        </Label>
      ))}
      <EffectComposer ref={composer} multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
        <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.2} />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
        {/* The composer turns the renderer's own tone mapping off. */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

export function CountryScene() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const caption = interpolate(frame, [130, 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: PALETTE.stageBottom }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true }}>
        <Stage frame={frame} />
      </ThreeCanvas>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 120px 110px", pointerEvents: "none" }}>
        <div
          style={{
            opacity: caption,
            transform: `translateY(${(1 - caption) * 24}px)`,
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 76,
            letterSpacing: -2,
            color: PALETTE.ink,
          }}
        >
          {`${COUNTS.provinces} provinces. ${COUNTS.districts} districts.`}
        </div>
        <div style={{ opacity: caption, fontFamily: FONTS.body, fontSize: 24, color: PALETTE.muted, marginTop: 14 }}>
          {SOURCES.boundaries}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
