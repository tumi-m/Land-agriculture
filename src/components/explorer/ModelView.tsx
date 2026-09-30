"use client";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import * as THREE from "three";
import {
  DEM_ATTRIBUTION,
  loadDem,
  RELIEF_EXAGGERATION,
} from "@/lib/dem";
import { DISTRICTS_BY_PROVINCE, PROVINCE_SHAPES } from "@/lib/geo";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import {
  LAND_LAYERS,
  noticeCountLabel,
  noticesForDistrict,
  modelDistance,
  sliceHeight,
  spacedLabels,
  type LandLayer,
} from "@/lib/exploded-map";
import { FARM_NOTICES, type FarmNotice } from "@/content/farm-notices";
import GovernmentNotices from "@/components/GovernmentNotices";
import DistrictLayerCard from "./DistrictLayerCard";
import type { ProvinceCode } from "@/lib/types";
import { SCENE } from "@/design/ramps";
import { isolatedDistrict, useExplorer } from "@/state/explorer";
import {
  CAMERA_PRESETS,
  DEFAULT_PRESET,
  presetDirection,
  presetFor,
  sheetViewOffset,
  type CameraPresetId,
} from "@/scene/camera";
import { createSceneCore } from "@/scene/core";
import { easeOut, prefersReducedMotion } from "@/lib/useTween";
import { useSwipeDown } from "@/lib/useSwipeDown";
import { loadSliceTexture } from "@/scene/textures";
import LANDCOVER from "../../../public/data/layers/landcover.json";
import SOIL_PH from "../../../public/data/layers/soil-ph.json";
import RAIN from "../../../public/data/layers/rain.json";
import { pieceTransforms } from "@/scene/depth";
import {
  applyReliefToPieces,
  buildFootprints,
  buildRivers,
  buildTethers,
  makePiece,
  type Piece,
} from "@/scene/pieces";
import {
  firstHit,
  isTap,
  normalisedPointer,
  pickableMeshes,
} from "@/scene/picking";
import {
  clampLabelPoint,
  clampLabelX,
  labelCap,
  labelRank,
  placeLabels,
  projectToScreen,
} from "@/scene/labels";

/** How long the camera flight to a new selection takes. */
const FLIGHT_MS = 1000;
const EXPLORED_KEY = "asbonge-explored";
export { EXTRUDE_DEPTH, makePiece } from "@/scene/pieces";

/**
 * The Model view: the exploded map of South Africa, its floating labels and
 * the slice dossier. The three.js renderer lives in `src/scene/core.ts`, what
 * is drawn in `src/scene/pieces.ts`, picking in `src/scene/picking.ts` and the
 * depth transforms in `src/scene/depth.ts`; this component keeps them in step
 * with the explorer store and owns the chrome around the canvas.
 */
export default function ModelView({
  onNotice,
  onTerrain,
}: {
  onNotice: (n: FarmNotice) => void;
  onTerrain: () => void;
}) {
  const selected = useExplorer((s) => {
    const kind = s.selection.kind;
    if (kind === "province" || kind === "district" || kind === "layer")
      return s.selection.province;
    if (kind === "notice") {
      const id = s.selection.id;
      return FARM_NOTICES.find((n) => n.id === id)?.province ?? null;
    }
    return null;
  });
  const district = useExplorer((s) =>
    s.selection.kind === "district" || s.selection.kind === "layer"
      ? s.selection.district
      : null,
  );
  const depth = useExplorer((s) => s.depth);
  const peel = useExplorer((s) => s.peel);
  const isolate = useExplorer((s) => s.isolate);
  const hiddenStore = useExplorer((s) => s.hidden);
  const cameraPreset = useExplorer((s) => s.cameraPreset);
  const setDepth = useExplorer((s) => s.setDepth);
  const setPeel = useExplorer((s) => s.setPeel);
  const setHidden = useExplorer((s) => s.setHidden);
  const toggleHidden = useExplorer((s) => s.toggleHidden);
  const setIsolate = useExplorer((s) => s.setIsolate);
  const setCameraPreset = useExplorer((s) => s.setCameraPreset);
  const selectProvince = useExplorer((s) => s.selectProvince);
  const selectDistrict = useExplorer((s) => s.selectDistrict);
  const chooseSlice = (
    province: ProvinceCode,
    id: string,
    slice: LandLayer,
  ) =>
    slice === "opportunity"
      ? selectDistrict(province, id)
      : selectLayer(province, id, slice);

  const host = useRef<HTMLDivElement>(null),
    labels = useRef(new Map<string, HTMLButtonElement>()),
    sliceLabels = useRef(new Map<string, HTMLButtonElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const [infoOpen, setInfoOpen] = useState(!!district);
  // A first visit: the province names pulse gently, a few times, to show
  // they are the way in. Once anything has been opened, never again.
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    try {
      if (selected) localStorage.setItem(EXPLORED_KEY, "1");
      setFresh(!selected && localStorage.getItem(EXPLORED_KEY) !== "1");
    } catch {
      setFresh(false);
    }
  }, [selected]);
  const [controlsOpen, setControlsOpen] = useState(false);
  // The open slice is part of the place, so a link can carry it: a district
  // on its own opens on Government land, and at=layer:… opens the slice named.
  const layer: LandLayer = useExplorer((s) =>
    s.selection.kind === "layer" ? s.selection.layer : "opportunity",
  );
  const selectLayer = useExplorer((s) => s.selectLayer);
  const [ready, setReady] = useState(false),
    // The opening shot has landed (or never ran). Exposed as data-settled
    // so tests can wait for labels to stop moving before clicking them.
    [settled, setSettled] = useState(false),
    [relief, setRelief] = useState(false),
    [reliefFailed, setReliefFailed] = useState(false),
    [water, setWater] = useState(false),
    [failed, setFailed] = useState(false),
    [auto, setAuto] = useState(false),
    [hover, setHover] = useState("");
  const core = useRef<ReturnType<typeof createSceneCore>>(null);
  const frameScene = useRef<() => void>(() => {});
  const sheetFrame = useRef<(box: DOMRect | null) => void>(() => {});
  /** Puts a texture on every district's matching slice. */
  const drapeSlices = useRef<(textures: (THREE.Texture | null)[]) => void>(
    () => {},
  );
  /** Drops any camera flight in progress, so a preset or zoom is not undone. */
  const cancelFlight = useRef<() => void>(() => {});
  const latest = useRef({ selected, district, depth, peel, layer });
  latest.current = { selected, district, depth, peel, layer };
  const layerMeta = LAND_LAYERS.find((l) => l.id === layer)!;
  const districtShape = selected
    ? DISTRICTS_BY_PROVINCE[selected].find((d) => d.id === district)
    : null;
  const heading = districtShape
    ? "Inside the region."
    : selected
      ? "Pull the province apart."
      : "A country you can open.";
  const announcement = districtShape
    ? `${districtShape.name}, ${layerMeta.name} layer.`
    : selected
      ? `${PROVINCES[selected].name} opened: ${DISTRICTS_BY_PROVINCE[selected].length} districts.`
      : "South Africa: nine provinces.";
  const notices =
    selected && district
      ? noticesForDistrict(selected, district)
      : FARM_NOTICES.filter((n) => !selected || n.province === selected);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || (!infoOpen && !controlsOpen)) return;
      event.stopImmediatePropagation();
      setInfoOpen(false);
      setControlsOpen(false);
      host.current?.parentElement
        ?.querySelector<HTMLButtonElement>(
          '.anatomy-mobile-dock button[aria-controls="anatomy-layer-details"]',
        )
        ?.focus();
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [infoOpen, controlsOpen]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const world: {
      provinces: Piece[];
      districts: Piece[];
      allBox: THREE.Box3;
      centre: THREE.Vector3;
      footprints: { id: string; outline: THREE.LineSegments }[];
      tethers: { piece: Piece; line: THREE.Line }[];
      waterGroup: THREE.Group;
    } = {
      provinces: [],
      districts: [],
      allBox: new THREE.Box3(),
      centre: new THREE.Vector3(),
      footprints: [],
      tethers: [],
      waterGroup: new THREE.Group(),
    };
    const engine = createSceneCore({ host: el, onFrame: (speed) => animate(speed) });
    if (!engine) {
      setFailed(true);
      return;
    }
    core.current = engine;
    const { renderer, scene, camera, controls } = engine;

    const provinces = PROVINCE_SHAPES.map((p) =>
      makePiece(p.code, p.code, p.geometry, false),
    );
    const allBox = new THREE.Box3();
    provinces.forEach((p) => allBox.expandByObject(p.group));
    const centre = allBox.getCenter(new THREE.Vector3());
    centre.y = 0;
    const districts = PROVINCE_ORDER.flatMap((code) =>
      DISTRICTS_BY_PROVINCE[code].map((d) =>
        makePiece(d.id, code, d.geometry, true),
      ),
    );
    for (const piece of [...provinces, ...districts]) {
      piece.centre.sub(centre);
      piece.group.position.copy(piece.centre);
      piece.anchor.copy(piece.centre);
      scene.add(piece.group);
    }
    // The entrance: on first load the provinces settle onto the floor one
    // after another, west to east, so the country visibly assembles from its
    // parts before anyone pulls it apart. Off under reduced motion.
    const entranceStart = performance.now();
    const drop = prefersReducedMotion()
      ? 0
      : allBox.getSize(new THREE.Vector3()).x * 0.12;
    const entranceOrder = new Map(
      [...provinces]
        .sort((a, b) => a.centre.x - b.centre.x)
        .map((p, i) => [p.id, i]),
    );
    const entrance = (id: string, now: number) => {
      if (!drop) return 0;
      const t = (now - entranceStart - (entranceOrder.get(id) ?? 0) * 85) / 820;
      return drop * (1 - easeOut(Math.min(1, Math.max(0, t))));
    };
    for (const p of provinces) p.group.position.y = entrance(p.id, entranceStart);
    // Sunrise: the light swings up from a low angle while the provinces
    // settle, so shadows sweep across the relief and the land is lit into
    // being. Off under reduced motion, like the entrance.
    const sunTo = engine.sun.position.clone();
    const sunFrom = new THREE.Vector3(-175, 22, -30);
    const SUNRISE_MS = 2400;
    if (drop) engine.sun.position.copy(sunFrom);
    const sunrise = (now: number) => {
      if (!drop) return false;
      const t = Math.min(1, Math.max(0, (now - entranceStart) / SUNRISE_MS));
      engine.sun.position.lerpVectors(sunFrom, sunTo, easeOut(t));
      engine.sun.intensity = 1.2 + 1.8 * easeOut(t);
      return t < 1;
    };
    // Per-piece hover lift, eased so a piece rises toward the pointer and
    // settles back when it leaves.
    const hoverLift = new Map<string, number>();
    const HOVER_LIFT = allBox.getSize(new THREE.Vector3()).x * 0.012;
    const liftFor = (id: string, hovered: boolean, speed: number) => {
      const was = hoverLift.get(id) ?? 0;
      const next = was + ((hovered ? HOVER_LIFT : 0) - was) * Math.min(1, speed * 1.6);
      hoverLift.set(id, Math.abs(next) < 1e-3 ? 0 : next);
      return next;
    };
    world.provinces = provinces;
    world.districts = districts;
    drapeSlices.current = (textures) => {
      for (const piece of districts)
        piece.meshes.forEach((mesh, i) => {
          const texture = textures[i];
          if (!texture) return;
          const material = mesh.material as THREE.MeshStandardMaterial;
          material.map = texture;
          // The map carries the colour now; the relief tint still multiplies.
          material.color.set(SCENE.white);
          material.needsUpdate = true;
        });
      engine.wake();
    };
    world.allBox = allBox;
    world.centre = centre;

    scene.add(world.waterGroup);

    // Relief arrives after the map does. The slabs draw flat straight away and
    // lift onto the real land surface once the elevation grid resolves, so a
    // slow connection costs detail rather than a wait — and a failed fetch just
    // leaves the map as it was.
    let reliefCancelled = false;
    void loadDem().then((dem) => {
      if (reliefCancelled) return;
      if (!dem) {
        setReliefFailed(true);
        return;
      }
      buildRivers(dem, centre)
        .children.slice()
        .forEach((child) => world.waterGroup.add(child));
      setWater(true);
      applyReliefToPieces([...provinces, ...districts], dem);
      setRelief(true);
      engine.wake();
    });

    for (const footprint of buildFootprints(provinces)) {
      scene.add(footprint.outline);
      world.footprints.push(footprint);
    }
    world.tethers = buildTethers(districts);
    for (const tether of world.tethers) scene.add(tether.line);

    // The ground runs on past the edge of the frame and fades into the
    // backdrop, instead of stopping at a hard square edge: the land stands
    // on a floor rather than on a tile.
    const grid = new THREE.GridHelper(
      420,
      42,
      SCENE.gridPrimary,
      SCENE.gridSecondary,
    );
    grid.position.y = -1.2;
    scene.add(grid);
    // Fog is measured from the camera, and the camera stands much further
    // back on a portrait phone than on a desktop; fixed distances fogged the
    // country itself there. animate() keeps the fog beyond whatever is being
    // looked at.
    const fog = new THREE.Fog(SCENE.fog, 230, 430);
    scene.fog = fog;

    // A pool of light under the country, so it reads as standing in a lit
    // space rather than floating over lines.
    const pool = (() => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const glow = new THREE.Color(SCENE.glow);
        const rgb = `${Math.round(glow.r * 255)}, ${Math.round(glow.g * 255)}, ${Math.round(glow.b * 255)}`;
        const gradient = ctx.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2,
        );
        gradient.addColorStop(0, `rgba(${rgb}, 0.32)`);
        gradient.addColorStop(0.45, `rgba(${rgb}, 0.12)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const radius = allBox.getSize(new THREE.Vector3()).x * 0.85;
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 64),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -1.1;
      mesh.renderOrder = -1;
      return mesh;
    })();
    scene.add(pool);

    type Flight = {
      from: THREE.Vector3;
      to: THREE.Vector3;
      targetFrom: THREE.Vector3;
      targetTo: THREE.Vector3;
      time: number;
      /** Overrides FLIGHT_MS; the opening shot takes longer. */
      duration?: number;
    };
    let flight: Flight | null = null;

    /**
     * The M1.1 pure function's inputs: pieces in scene units plus the current
     * depth and selection. Both the framing and the animation loop read it, so
     * the drawn offsets and the camera target can never disagree.
     */
    const depthInput = () => ({
      depth: latest.current.depth,
      selection: useExplorer.getState().selection,
      provinces: provinces.map((p) => ({
        id: p.id as ProvinceCode,
        centre: [p.centre.x, p.centre.z] as [number, number],
      })),
      districts: districts.map((p) => ({
        id: p.id,
        province: p.province,
        centre: [p.centre.x, p.centre.z] as [number, number],
      })),
    });

    /**
     * Frames the selection. `setViewOffset`, applied through `setSheet`,
     * already biases the visible region around an open sheet.
     */
    /** How much further back to stand while a sheet narrows the view. */
    let sheetScale = 1;
    const frame = () => {
      engine.wake();
      const { selected, district } = latest.current;
      const parent = provinces.find((p) => p.id === selected);
      const child = districts.find(
        (p) => p.id === district && p.province === selected,
      );
      const transform = child ? pieceTransforms(depthInput()).get(child.id) : null;
      const target = (child ?? parent)?.centre.clone() ?? new THREE.Vector3();
      if (child && transform) {
        target.x += transform.offsetX;
        target.z += transform.offsetZ;
      }
      target.y = child ? 12 : parent ? 5 : 0;
      const size =
        (child ?? parent)?.size ?? allBox.getSize(new THREE.Vector3());
      const span = Math.max(size.x + 30, size.z + 30, child ? 48 : 0);
      const aspect = Math.min(camera.aspect, 1.4);
      const distance = modelDistance(span, aspect, camera.fov) * sheetScale;
      // The mount effects re-frame the same place straight away; let the
      // opening shot finish rather than cutting it short.
      if (flight?.duration && flight.targetTo.distanceTo(target) < 0.01) return;
      flight = {
        from: camera.position.clone(),
        to: target
          .clone()
          .addScaledVector(presetDirection(DEFAULT_PRESET), distance),
        targetFrom: controls.target.clone(),
        targetTo: target,
        time: performance.now(),
      };
    };
    frameScene.current = frame;
    cancelFlight.current = () => {
      flight = null;
    };

    /** Shows the sub-rectangle of the canvas an open sheet leaves free. */
    const setSheet = (box: DOMRect | null) => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (!box || width < 1 || height < 1) {
        camera.clearViewOffset();
        camera.updateProjectionMatrix();
        if (sheetScale !== 1) {
          sheetScale = 1;
          frame();
        }
        return;
      }
      // The sheet is measured in the page's coordinates; the camera needs
      // the stage's. Mixing the two framed the model against a panel that
      // was really a header's height lower than it looked.
      const stage = el.getBoundingClientRect();
      const left = box.left - stage.left;
      const top = box.top - stage.top;
      // A side sheet on a wide stage, a bottom sheet on a narrow one.
      // A bottom sheet also leaves the breadcrumb above the model (the
      // heading steps aside while a sheet is open on a small screen).
      const crumb = el.parentElement
        ?.querySelector<HTMLElement>(".anatomy-breadcrumb")
        ?.getBoundingClientRect();
      const inset =
        box.width < width * 0.6
          ? { right: Math.round(width - left) }
          : {
              bottom: Math.round(height - top),
              top: crumb ? Math.max(0, Math.round(crumb.bottom - stage.top)) : 0,
            };
      const offset = sheetViewOffset(width, height, inset);
      if (offset)
        camera.setViewOffset(width, height, offset.x, offset.y, width, height);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      // Re-frame when the free space changes size, so the piece fits it.
      const scale = offset?.scale ?? 1;
      if (Math.abs(scale - sheetScale) > 0.01) {
        sheetScale = scale;
        frame();
      }
      engine.wake();
    };
    sheetFrame.current = setSheet;

    const ray = new THREE.Raycaster(),
      mouse = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | null = null;
    let hovering: THREE.Mesh | null = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Placement is decided for the frame as a whole, not label by label:
    // whether a name can be read depends on what else is next to it. Each
    // label positions itself here and joins the queue; applyLabels settles
    // the collisions once every piece has had its say.
    const pending: {
      node: HTMLButtonElement;
      id: string;
      x: number;
      y: number;
      visible: boolean;
      rank: number;
    }[] = [];

    const project = (
      node: HTMLButtonElement | undefined,
      point: THREE.Vector3,
      visible: boolean,
      id?: string,
      rank = 0,
    ) => {
      if (!node) return;
      const screen = projectToScreen(point, camera, el.clientWidth, el.clientHeight);
      visible = visible && !screen.behind;
      if (id === undefined) {
        node.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;
        node.style.opacity = visible ? "1" : "0";
        node.style.pointerEvents = visible ? "auto" : "none";
        node.tabIndex = visible ? 0 : -1;
        return;
      }
      pending.push({ node, id, x: screen.x, y: screen.y, visible, rank });
    };

    // The full size of each label, measured while it is drawn in full.
    //
    // A dot is far smaller than the name it replaces, so measuring one would
    // say it fits, which would turn it back into a name, which would collide,
    // which would turn it back into a dot: the label would flicker between
    // the two every frame. Measuring only the full form breaks that loop.
    const labelSizes = new Map<string, { width: number; height: number }>();

    const applyLabels = () => {
      for (const entry of pending) {
        if (entry.node.classList.contains("is-dot")) continue;
        const width = entry.node.offsetWidth;
        const height = entry.node.offsetHeight;
        if (width && height) labelSizes.set(entry.id, { width, height });
      }
      const { shown } = placeLabels(
        pending
          .filter((entry) => entry.visible)
          .map((entry) => {
            const size = labelSizes.get(entry.id);
            const width = size?.width ?? 120;
            const height = size?.height ?? 24;
            // Clamp before the collision test, not after: a label pulled in
            // from the edge can land on its neighbour, and that collision is
            // the one that has to be resolved.
            const point = clampLabelPoint(
              entry.x,
              entry.y,
              width,
              height,
              el.clientWidth,
              el.clientHeight,
            );
            entry.x = point.x;
            entry.y = point.y;
            return { id: entry.id, ...point, width, height, rank: entry.rank };
          }),
        labelCap(el.clientWidth),
      );
      const drawn = new Set(shown);
      for (const entry of pending) {
        const dot = entry.visible && !drawn.has(entry.id);
        entry.node.style.transform = `translate(${entry.x}px,${entry.y}px) translate(-50%,-100%)`;
        entry.node.style.opacity = entry.visible ? "1" : "0";
        entry.node.classList.toggle("is-dot", dot);
        // A dot is still the piece's control: it stays tappable and
        // focusable, or the overflow would be land nobody can reach.
        entry.node.style.pointerEvents = entry.visible ? "auto" : "none";
        entry.node.tabIndex = entry.visible ? 0 : -1;
      }
      pending.length = 0;
    };

    let openingDone = false;
    let rippleFor: string | null = null;
    let rippleAt = 0;
    let peelFor: string | null = null;
    let peelAt = 0;
    const RIPPLE_MS = 420;
    const PEEL_STEP_MS = 90;
    /** How long a district waits before leaving: its distance from the
     *  middle of its province, as a share of the province's size. */
    const rippleDelay = (piece: (typeof districts)[number]) => {
      const parent = provinces.find((p) => p.id === piece.province);
      if (!parent || reduced) return 0;
      const reach = Math.max(parent.size.x, parent.size.z) / 2 || 1;
      const dx = piece.centre.x - parent.centre.x;
      const dz = piece.centre.z - parent.centre.z;
      return Math.min(1, Math.hypot(dx, dz) / reach) * RIPPLE_MS;
    };
    const animate = (speed: number) => {
      const now = performance.now();
      // Keep drawing through the sunrise and the entrance: the loop sleeps
      // when idle, and these run on the clock, not on input.
      if (sunrise(now)) engine.wake();
      const focus = camera.position.distanceTo(controls.target);
      fog.near = focus * 1.25;
      fog.far = focus * 2.6;
      const state = latest.current;
      const store = useExplorer.getState();
      const solo = store.isolate ? isolatedDistrict(store.selection) : null;
      const transforms = pieceTransforms(depthInput());
      world.waterGroup.visible = !state.selected;
      // Choreography clocks. Opening a province starts a ripple: districts
      // leave the assembled province from its middle outwards, so the eye
      // follows the land coming apart instead of watching it jump. Choosing
      // a district peels its slices from the ground up.
      if (state.selected !== rippleFor) {
        rippleFor = state.selected;
        rippleAt = now;
        if (!reduced)
          for (const d of districts)
            if (d.province === state.selected) d.group.position.copy(d.centre);
      }
      if (state.district !== peelFor) {
        peelFor = state.district;
        peelAt = now;
      }
      for (const p of provinces) {
        const transform = transforms.get(p.id);
        const muted = !!state.selected || !!transform?.ghost;
        p.group.visible =
          p.id !== state.selected && (!solo || p.id === solo.province);
        p.group.position.lerp(
          new THREE.Vector3(
            p.centre.x + (transform?.offsetX ?? 0),
            0,
            p.centre.z + (transform?.offsetZ ?? 0),
          ),
          speed,
        );
        const lift = entrance(p.id, now);
        const hovered = !state.selected && p.id === hovering?.userData.id;
        p.group.position.y = lift + liftFor(p.id, hovered, speed);
        const material = p.meshes[0].material as THREE.MeshStandardMaterial;
        material.opacity = drop ? 1 - 0.8 * (lift / drop) : 1;
        material.emissive.set(engine.accent());
        material.emissiveIntensity = hovered ? 0.14 : 0;
        material.color.set(
          muted
            ? SCENE.modelBase
            : p.id === hovering?.userData.id
              ? engine.accent()
              : SCENE.modelBase,
        );
        project(
          labels.current.get(p.id),
          p.centre.clone().setY(3),
          !state.selected,
          p.id,
          labelRank({
            hovered: p.id === hovering?.userData.id,
            area: p.size.x * p.size.z,
          }),
        );
      }
      for (const { id, outline } of world.footprints)
        outline.visible = id === state.selected;
      const parent = provinces.find((p) => p.id === state.selected);
      for (const p of districts) {
        const transform = transforms.get(p.id);
        p.group.visible =
          p.province === state.selected && (!solo || p.id === solo.district);
        if (!p.group.visible) {
          project(labels.current.get(p.id), p.centre, false, p.id);
          continue;
        }
        const chosen = p.id === state.district;
        const target = p.centre
          .clone()
          .add(
            new THREE.Vector3(
              transform?.offsetX ?? 0,
              transform?.lift ?? 0,
              transform?.offsetZ ?? 0,
            ),
          );
        // A district you could pick rises to meet the pointer; the chosen one
        // is already lifted apart and stays put. Added to the target, not the
        // position, or the lerp would compound it every frame.
        target.y += liftFor(
          p.id,
          !chosen && p.id === hovering?.userData.id,
          speed,
        );
        if (now - rippleAt >= rippleDelay(p)) p.group.position.lerp(target, speed);
        else engine.wake();
        p.meshes.forEach((m, i) => {
          m.visible = !chosen || !store.hidden.has(LAND_LAYERS[i].id);
          // The chosen district's Peel slider trims its own separation; the
          // depth stages come from the tested pure function.
          const want = sliceHeight(
            i,
            chosen ? state.peel : (transform?.layerGap ?? 0),
          );
          // Bottom slice first, each one a beat after the one below it.
          if (!chosen || reduced || now - peelAt >= i * PEEL_STEP_MS)
            m.position.y += (want - m.position.y) * speed;
          else engine.wake();
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.opacity = 1;
          mat.emissive.set(LAND_LAYERS[i].colour);
          mat.emissiveIntensity =
            chosen && state.layer === LAND_LAYERS[i].id
              ? 0.18
              : hovering === m
                ? 0.12
                : 0;
        });
        p.anchor
          .copy(p.group.position)
          .add(
            new THREE.Vector3(
              0,
              chosen ? sliceHeight(3, state.peel) + 2 : 5,
              0,
            ),
          );
        project(
          labels.current.get(p.id),
          p.anchor,
          !state.district || chosen,
          p.id,
          labelRank({
            selected: chosen,
            hovered: p.id === hovering?.userData.id,
            area: p.size.x * p.size.z,
          }),
        );
        if (chosen) {
          const anchors = LAND_LAYERS.map((l, i) => ({
            id: l.id,
            mesh: p.meshes[i],
            position: p.group.position
              .clone()
              .add(
                new THREE.Vector3(
                  -p.size.x * 0.25,
                  p.meshes[i].position.y + 1,
                  0,
                ),
              )
              .project(camera),
          })).reverse();
          const ys = spacedLabels(
            anchors.map((a) => ((1 - a.position.y) / 2) * el.clientHeight),
            150,
            el.clientHeight - 100,
            48,
          );
          anchors.forEach((a, i) => {
            const node = sliceLabels.current.get(a.id),
              line = leaders.current.get(a.id);
            const visible = a.mesh.visible && a.position.z < 1;
            const x = ((a.position.x + 1) / 2) * el.clientWidth,
              y = ((1 - a.position.y) / 2) * el.clientHeight;
            const labelX = clampLabelX(x, 210, el.clientWidth);
            if (node) {
              node.style.transform = `translate(${labelX}px,${ys[i]}px)`;
              node.style.opacity = visible ? "1" : "0";
              node.style.pointerEvents = visible ? "auto" : "none";
              node.tabIndex = visible ? 0 : -1;
            }
            if (line) {
              line.style.opacity = visible ? ".65" : "0";
              line.setAttribute("x1", String(x));
              line.setAttribute("y1", String(y));
              line.setAttribute("x2", String(labelX + 135));
              line.setAttribute("y2", String(ys[i] + 15));
            }
          });
        }
      }
      if (parent) {
        for (const footprint of world.footprints)
          footprint.outline.visible = footprint.id === parent.id;
      }
      for (const { piece, line } of world.tethers) {
        line.visible = piece.province === state.selected && state.depth > 0.03;
        if (!line.visible) continue;
        const position = line.geometry.getAttribute("position");
        position.setXYZ(0, piece.centre.x, 0, piece.centre.z);
        position.setXYZ(
          1,
          piece.group.position.x,
          piece.group.position.y,
          piece.group.position.z,
        );
        position.needsUpdate = true;
        line.computeLineDistances();
      }
      if (!state.district) {
        for (const node of sliceLabels.current.values())
          project(node, new THREE.Vector3(), false);
        for (const line of leaders.current.values()) line.style.opacity = "0";
      }
      if (flight) {
        const t = reduced
            ? 1
            : Math.min(1, (now - flight.time) / (flight.duration ?? FLIGHT_MS)),
          e = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(flight.from, flight.to, e);
        controls.target.lerpVectors(flight.targetFrom, flight.targetTo, e);
        if (t === 1) flight = null;
      }
      // Whether the opening shot landed, was cancelled by a drag or a
      // preset, or never ran, the first frame without a flight settles it.
      if (!flight && !openingDone) {
        openingDone = true;
        setSettled(true);
      }
      if (!flight) {
        // Which preset the current angle matches — null once the user orbits
        // away from all three. Kept in the store so the chrome can show it.
        const matched = presetFor(camera.position.clone().sub(controls.target), 4);
        if (useExplorer.getState().cameraPreset !== matched)
          useExplorer.setState({ cameraPreset: matched });
      }
      // Last, once every piece has queued its label: the collisions can only
      // be settled when the whole frame is known.
      applyLabels();
    };

    const hoverRef = { current: "" };
    setHover(hoverRef.current);

    const getHit = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      normalisedPointer(clientX, clientY, rect, mouse);
      ray.setFromCamera(mouse, camera);
      return firstHit(
        ray,
        pickableMeshes(provinces, districts, latest.current.selected),
      );
    };
    const down = (e: PointerEvent) => {
      pointerStart = { x: e.clientX, y: e.clientY };
      flight = null;
      controls.autoRotate = false;
      setAuto(false);
    };
    const move = (e: PointerEvent) => {
      engine.wake();
      if (e.pointerType === "touch") return;
      hovering = (getHit(e.clientX, e.clientY)?.object as THREE.Mesh) ?? null;
      el.style.cursor = hovering ? "pointer" : "grab";
      const id = hovering?.userData.id ?? "";
      if (hoverRef.current !== id) {
        hoverRef.current = id;
        setHover(id);
      }
    };
    const up = (e: PointerEvent) => {
      if (!isTap(pointerStart, { x: e.clientX, y: e.clientY })) {
        pointerStart = null;
        return;
      }
      pointerStart = null;
      const hit = getHit(e.clientX, e.clientY);
      if (!hit) return;
      const d = hit.object.userData;
      const store = useExplorer.getState();
      if (store.selection.kind === "country") {
        store.selectProvince(d.province);
        return;
      }
      if (latest.current.district !== d.id) {
        store.setHidden(new Set());
        store.setPeel(0.82);
      }
      if (d.layer === "opportunity") store.selectDistrict(d.province, d.id);
      else store.selectLayer(d.province, d.id, d.layer);
      setInfoOpen(true);
      setControlsOpen(false);
    };
    const cancel = () => {
      engine.wake();
      pointerStart = null;
      hovering = null;
      if (hoverRef.current !== "") {
        hoverRef.current = "";
        setHover("");
      }
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    renderer.domElement.addEventListener("pointerleave", cancel);

    frame();
    // The opening shot: the camera glides in from high over the west while
    // the sun rises and the provinces settle, and arrives at the same ¾ view
    // it would otherwise start at. Any drag, zoom or preset cancels it, as it
    // does any flight. Skipped under reduced motion (drop is 0 there).
    // frame() set it through a closure, which control-flow analysis
    // cannot see, so it still reads as null here without the widening.
    const opening = flight as Flight | null;
    if (drop && opening) {
      const offset = opening.to
        .clone()
        .sub(opening.targetTo)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.55)
        .multiplyScalar(1.55);
      offset.y *= 1.35;
      opening.from = opening.targetTo.clone().add(offset);
      opening.duration = SUNRISE_MS;
      camera.position.copy(opening.from);
      controls.target.copy(opening.targetTo);
      opening.targetFrom = opening.targetTo.clone();
    }
    setReady(true);

    return () => {
      reliefCancelled = true;
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("pointerleave", cancel);
      engine.dispose();
      core.current = null;
    };
    // Built once on purpose; later changes reach the scene through the store
    // and the refs the animation loop reads. The effect is empty on purpose.
  }, []);

  useEffect(() => {
    if (!core.current) return;
    frameScene.current();
  }, [selected, district]);

  // The slices wear the measurements they stand for: land cover, soil pH
  // and rainfall, loaded the first time a province is opened (the slices
  // only separate inside one). Government land keeps its flat colour.
  const [draped, setDraped] = useState(false);
  useEffect(() => {
    if (!selected || draped) return;
    let cancelled = false;
    void Promise.all(LAND_LAYERS.map((l) => loadSliceTexture(l.id))).then(
      (textures) => {
        if (cancelled) return;
        drapeSlices.current(textures);
        setDraped(textures.some(Boolean));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selected, draped]);

  useEffect(() => {
    core.current?.wake();
  }, [depth, peel, hiddenStore, layer, isolate]);

  // An open sheet claims part of the stage: frame the model in what is left.
  useEffect(() => {
    const box = infoOpen
      ? document
          .querySelector<HTMLElement>(".anatomy-dossier")
          ?.getBoundingClientRect() ?? null
      : null;
    sheetFrame.current(box);
  }, [infoOpen, controlsOpen, selected, district]);

  const zoom = (factor: number) => {
    const engine = core.current;
    if (!engine) return;
    cancelFlight.current();
    const offset = engine.camera.position
      .clone()
      .sub(engine.controls.target)
      .multiplyScalar(factor);
    offset.setLength(THREE.MathUtils.clamp(offset.length(), 20, 700));
    engine.camera.position.copy(engine.controls.target).add(offset);
    engine.wake();
  };
  /** Turns the camera around what it is looking at, for the keyboard. */
  const orbitBy = (azimuth: number, polar: number) => {
    const engine = core.current;
    if (!engine) return;
    cancelFlight.current();
    const { camera, controls } = engine;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += azimuth;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + polar,
      controls.minPolarAngle,
      controls.maxPolarAngle,
    );
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    engine.wake();
  };
  const STEP = Math.PI / 12;
  const onStageKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const act: Record<string, () => void> = {
      ArrowLeft: () => orbitBy(-STEP, 0),
      ArrowRight: () => orbitBy(STEP, 0),
      ArrowUp: () => orbitBy(0, -STEP / 2),
      ArrowDown: () => orbitBy(0, STEP / 2),
      "+": () => zoom(0.8),
      "=": () => zoom(0.8),
      "-": () => zoom(1.25),
      "0": () => frameScene.current(),
    };
    const run = act[event.key];
    if (!run || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    run();
  };
  const closeInfo = () => setInfoOpen(false);
  const closeControls = () => setControlsOpen(false);
  const swipeInfo = useSwipeDown(closeInfo);
  const swipeControls = useSwipeDown(closeControls);
  const chooseDistrict = (id: string) => {
    setHidden(new Set());
    setInfoOpen(true);
    setControlsOpen(false);
    // Moving to a neighbour keeps the slice being read, so the card's
    // numbers can travel from one district to the next.
    chooseSlice(selected!, id, layer);
    setPeel(0.82);
  };
  const applyPreset = (id: CameraPresetId) => {
    const engine = core.current;
    if (!engine) return;
    cancelFlight.current();
    const distance = engine.camera.position
      .clone()
      .sub(engine.controls.target)
      .length();
    engine.camera.position
      .copy(engine.controls.target)
      .addScaledVector(presetDirection(id), distance);
    setCameraPreset(id);
    engine.wake();
  };
  return (
    <div
      className={`anatomy-stage${fresh ? " is-fresh" : ""}`}
      data-camera={cameraPreset ?? "free"}
      data-settled={settled}
    >
      <div
        ref={host}
        className="anatomy-canvas"
        role="application"
        tabIndex={0}
        onKeyDown={onStageKey}
        aria-roledescription="3D map"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0"
        aria-label="Exploded 3D map. Arrow keys turn and tilt it, plus and minus zoom, 0 reframes. Use the named region buttons or the region selector to explore; drag to orbit and pinch to zoom."
      />
      {/* What just happened, for someone who cannot see the scene change. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {!ready && !failed && (
        <div className="anatomy-loading">Assembling the land…</div>
      )}
      {failed && (
        <div className="anatomy-loading">
          <p>3D rendering is unavailable on this device.</p>
          <button onClick={onTerrain}>Open terrain map</button>
        </div>
      )}
      {(selected
        ? DISTRICTS_BY_PROVINCE[selected]
        : PROVINCE_SHAPES.map((p) => ({ id: p.code, name: p.name }))
      ).map((p) => (
        <button
          key={p.id}
          ref={(node) => {
            if (node) labels.current.set(p.id, node);
            else labels.current.delete(p.id);
          }}
          className={`anatomy-label ${hover === p.id ? "is-hovered" : ""}`}
          style={{ opacity: 0 }}
          tabIndex={-1}
          onClick={() =>
            selected ? chooseDistrict(p.id) : selectProvince(p.id as ProvinceCode)
          }
        >
          {p.name.replace(/ District$/, "")}
          {/* The count belongs to a district, where it is a fact about one
              place you are choosing between a few. At country scale it
              doubled the height of nine labels already fighting for the
              same space, and the province panel carries the same number. */}
          {selected && (
            <small>{noticeCountLabel(noticesForDistrict(selected, p.id))}</small>
          )}
        </button>
      ))}
      <svg className="anatomy-leaders" aria-hidden="true">
        {LAND_LAYERS.map((l) => (
          <line
            key={l.id}
            ref={(n) => {
              if (n) leaders.current.set(l.id, n);
              else leaders.current.delete(l.id);
            }}
            stroke={l.colour}
            strokeWidth="1"
            style={{ opacity: 0 }}
          />
        ))}
      </svg>
      {LAND_LAYERS.map((l, i) => (
        <button
          key={l.id}
          ref={(n) => {
            if (n) sliceLabels.current.set(l.id, n);
            else sliceLabels.current.delete(l.id);
          }}
          tabIndex={-1}
          className="anatomy-slice-label"
          aria-pressed={layer === l.id}
          style={{ opacity: 0, borderColor: l.colour }}
          onClick={() => {
            if (selected && district) chooseSlice(selected, district, l.id);
            setInfoOpen(true);
            setControlsOpen(false);
          }}
        >
          <i style={{ background: l.colour }} />
          {String(i + 1).padStart(2, "0")} {l.name}
        </button>
      ))}
      {/* The stage's controls live in one grid laid over the canvas. Each
          has its own area, so they cannot land on one another at any width —
          they used to be positioned one by one, and the tools, the dock and
          the camera switch took turns covering each other. */}
      <div
        className={`anatomy-hud${controlsOpen ? " controls-open" : ""}${
          infoOpen ? " info-open" : ""
        }`}
      >
        <div className="anatomy-breadcrumb">
          <button onClick={() => selectProvince(null)}>South Africa</button>
          {selected && (
            <>
              <span>/</span>
              <button onClick={() => selectDistrict(selected, null)}>
                {PROVINCES[selected].name}
              </button>
            </>
          )}
          {districtShape && (
            <>
              <span>/</span>
              <strong>{districtShape.name.replace(/ District$/, "")}</strong>
            </>
          )}
        </div>
        <div className="anatomy-title">
          {/* Keyed on the words, so each change of level plays the rise again:
              the heading moving is the signal that the scene below has too. */}
          <h2 key={heading} aria-label={heading}>
            {heading.split(" ").map((word, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="anatomy-word" aria-hidden>
                  <span style={{ "--i": i } as CSSProperties}>{word}</span>
                </span>
              </Fragment>
            ))}
          </h2>
          <span key={`${heading}-hint`} className="anatomy-hint">
            {districtShape
              ? "Select a floating layer to inspect it."
              : selected
                ? "Choose a district to separate its information layers."
                : "Select a province to lift out its districts."}
          </span>
        </div>
        <div className="anatomy-camera" role="group" aria-label="Camera angle">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              aria-pressed={cameraPreset === preset.id}
              aria-label={`${preset.label} view`}
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="anatomy-mobile-dock">
          <button className="anatomy-real-terrain" onClick={onTerrain}>
            View real terrain ↗
          </button>
          <button
            className="anatomy-controls-toggle"
            aria-expanded={controlsOpen}
            aria-controls="anatomy-region-controls"
            onClick={() => {
              setControlsOpen(!controlsOpen);
              setInfoOpen(false);
            }}
          >
            Regions & layers
          </button>
          <button
            aria-expanded={infoOpen}
            aria-controls="anatomy-layer-details"
            onClick={() => {
              setInfoOpen(!infoOpen);
              setControlsOpen(false);
            }}
          >
            {infoOpen
              ? "Close information ×"
              : districtShape
                ? "Region information"
                : `Government land · ${notices.length}`}
          </button>
        </div>
        <div className="anatomy-tools">
          <button aria-label="Zoom in" onClick={() => zoom(0.8)}>
            +
          </button>
          <button aria-label="Zoom out" onClick={() => zoom(1.25)}>
            −
          </button>
          <button
            aria-label="Reframe selection"
            onClick={() => frameScene.current()}
          >
            ⌖
          </button>
          <button
            aria-pressed={auto}
            onClick={() => {
              const engine = core.current;
              if (engine) {
                engine.controls.autoRotate = !auto;
                engine.controls.autoRotateSpeed = 0.65;
                engine.wake();
              }
              setAuto(!auto);
            }}
          >
            {auto ? "Pause" : "Orbit"}
          </button>
        </div>
        {infoOpen && (
          <div className="anatomy-dossier" id="anatomy-layer-details">
            <div className="anatomy-dossier-head" {...swipeInfo}>
              <span style={{ color: layerMeta.colour }}>
                ● {districtShape ? layerMeta.name : "Government land"}
              </span>
              <button
                onClick={() => setInfoOpen(false)}
                aria-label="Collapse layer information"
              >
                Close ×
              </button>
            </div>
            <p>
              {districtShape?.name ??
                (selected ? PROVINCES[selected].name : "South Africa")}
            </p>
            {districtShape && layer !== "opportunity" && (
              <DistrictLayerCard
                key={layer}
                district={districtShape.id}
                layer={layer}
              />
            )}
            {districtShape && (
              <p className="anatomy-slice-note">{layerMeta.description}</p>
            )}
            {(!districtShape || layer === "opportunity") && (
              <GovernmentNotices
                key={`${selected}-${district}`}
                notices={notices}
                onSelect={onNotice}
              />
            )}
            {districtShape && layer !== "opportunity" && (
              <button className="anatomy-terrain-link" onClick={onTerrain}>
                Inspect real terrain & data ↗
              </button>
            )}
            {districtShape && (
              <button
                className="anatomy-isolate"
                aria-pressed={isolate}
                onClick={() => setIsolate(!isolate)}
              >
                {isolate ? "Show surrounding land" : "Isolate this district"}
              </button>
            )}
          </div>
        )}
        <div
          className={`anatomy-console ${controlsOpen ? "is-open" : ""}`}
          id="anatomy-region-controls"
        >
          <div className="anatomy-controls-heading" {...swipeControls}>
            <strong>Regions & layers</strong>
            <button
              onClick={() => setControlsOpen(false)}
              aria-label="Close region controls"
            >
              Close ×
            </button>
          </div>
          <div className="anatomy-select">
            <label>
              REGION
              <select
                aria-label="Select province to explode"
                value={selected ?? ""}
                onChange={(e) =>
                  selectProvince((e.target.value || null) as ProvinceCode | null)
                }
              >
                <option value="">South Africa</option>
                {PROVINCE_ORDER.map((code) => (
                  <option key={code} value={code}>
                    {PROVINCES[code].name}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <label>
                DISTRICT
                <select
                  aria-label="Select district to peel"
                  value={district ?? ""}
                  onChange={(e) =>
                    e.target.value
                      ? chooseDistrict(e.target.value)
                      : selectDistrict(selected, null)
                  }
                >
                  <option value="">All districts</option>
                  {DISTRICTS_BY_PROVINCE[selected].map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className="anatomy-slider">
            <span>
              Separate regions <b>{Math.round(depth * 100)}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step=".01"
              value={depth}
              disabled={!selected}
              onChange={(e) => setDepth(Number(e.target.value))}
            />
          </label>
          {district && (
            <label className="anatomy-slider">
              <span>
                Peel layers <b>{Math.round(peel * 100)}%</b>
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step=".01"
                value={peel}
                onChange={(e) => setPeel(Number(e.target.value))}
              />
            </label>
          )}
          {district && (
            <div className="anatomy-layer-switches">
              {LAND_LAYERS.map((l) => (
                <button
                  key={l.id}
                  aria-pressed={!hiddenStore.has(l.id)}
                  aria-label={l.name}
                  onClick={() => toggleHidden(l.id)}
                >
                  <i style={{ background: l.colour }} />
                  {/* The first word carries it in a row this tight; the
                      full name is the button's accessible name. */}
                  {l.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
          <button
            className="anatomy-reassemble"
            onClick={() => {
              if (depth === 0) {
                setDepth(0.72);
                setPeel(0.82);
              } else {
                setDepth(0);
                setPeel(0);
                setHidden(new Set());
                setIsolate(false);
                // At country scale there is no province to step back to; the
                // old non-null assertion wrote a province selection holding
                // null, which the URL then carried as "province:null".
                if (selected) selectDistrict(selected, null);
              }
            }}
          >
            {depth === 0 ? "Separate regions" : "Reassemble"}
          </button>
        </div>
        <p className="anatomy-source" role="status">
          {relief
            ? `Regional relief (~2.3 km grid), vertical scale ×${RELIEF_EXAGGERATION}${
                water && !selected ? " · major rivers shown" : ""
              } · ${DEM_ATTRIBUTION}`
            : reliefFailed
              ? "Regional relief unavailable · overview still usable"
              : "Adding regional relief…"}
        </p>
        <p className="anatomy-footnote">
          {draped && selected
            ? `Slices: land cover ${LANDCOVER.source} (${LANDCOVER.date}); soil pH ${SOIL_PH.source} (${SOIL_PH.date}); rainfall ${RAIN.source} (${RAIN.date}) · each on a grid of about 1.7 km · slab thickness is not soil depth`
            : "Geographic shapes · thematic slices, not measured soil strata · drag to orbit · pinch to zoom"}
        </p>
      </div>
    </div>
  );
}
