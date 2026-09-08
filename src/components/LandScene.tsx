"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  DISTRICTS_BY_PROVINCE,
  PROVINCE_SHAPES,
  projectedRings,
} from "@/lib/geo";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import { cx, group } from "@/lib/format";
import type { ProvinceCode } from "@/lib/types";

import { METRICS, type Metric, valueOf } from "@/lib/land-metrics";

const MAX_HEIGHT = 30;
const BASE = 0.6;
/** How flat the rest of the country lies once one province is opened. */
const GHOST = 0.22;
/** How far the districts travel apart, in world units. */
const SPREAD = 7.5;
const LIFT = 5;

/** Where the camera arrives from, and where it settles. */
const INTRO_FROM = new THREE.Vector3(-10, 148, 60);
const INTRO_TO = new THREE.Vector3(-12, 74, 104);

/** Ramp steps as hex, matching the --land-* tokens so 2D and 3D agree. */
const RAMP_LIGHT = [
  "#e9eee1",
  "#d3dec5",
  "#bacaa6",
  "#a0b687",
  "#88a972",
  "#688f53",
  "#4f7540",
  "#2a4524",
];
const RAMP_DARK = [
  "#232d1e",
  "#2e3f26",
  "#3b532f",
  "#4a6b39",
  "#5c8546",
  "#74a159",
  "#90bc77",
  "#b4d49e",
];

interface DistrictPiece {
  id: string;
  name: string;
  group: THREE.Group;
  solid: THREE.Mesh;
  outline: THREE.LineSegments;
  /** Plan-view centre in the centred scene. */
  centre: THREE.Vector3;
  /** Unit vector away from the province centre — the direction it flies apart. */
  away: THREE.Vector3;
  /** Position in the outward-running flight order. */
  order: number;
  /** How far along that flight it currently is, for label placement. */
  reach: number;
}

interface ProvinceObject {
  code: ProvinceCode;
  group: THREE.Group;
  solid: THREE.Mesh;
  outline: THREE.LineSegments;
  top: THREE.Vector3;
  targetScale: number;
  currentScale: number;
}

/**
 * The map as a solid.
 *
 * Height is the measure — linear, so North West's 300 000 ha really does tower
 * over KwaZulu-Natal's 3 684 rather than being flattened into comparability.
 * Colour carries the same value, so the reading survives a flat viewing angle.
 */
export default function LandScene({
  metric,
  selected,
  onSelect,
  district,
  onSelectDistrict,
  dark,
  narrationOverlay = false,
}: {
  metric: Metric;
  selected: ProvinceCode | null;
  onSelect: (code: ProvinceCode | null) => void;
  district: string | null;
  onSelectDistrict: (id: string | null) => void;
  dark: boolean;
  narrationOverlay?: boolean;
}) {
  const mount = useRef<HTMLDivElement | null>(null);
  const scene = useRef<THREE.Scene | null>(null);
  const camera = useRef<THREE.PerspectiveCamera | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const controls = useRef<OrbitControls | null>(null);
  const objects = useRef<ProvinceObject[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2(-2, -2));
  const flight = useRef<{
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
    cameraFrom: THREE.Vector3;
    cameraTo: THREE.Vector3;
    startedAt: number;
  } | null>(null);
  const intro = useRef<number | null>(null);

  // Refs the animation loop reads without being rebuilt.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const darkRef = useRef(dark);
  darkRef.current = dark;

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [topDown, setTopDown] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [hover, setHover] = useState<ProvinceCode | null>(null);
  const labelRefs = useRef(new Map<ProvinceCode, HTMLButtonElement>());
  const districtLabelRefs = useRef(new Map<string, HTMLButtonElement>());
  /** Districts are built the first time a province is opened, then kept. */
  const districts = useRef<Map<ProvinceCode, DistrictPiece[]>>(new Map());
  const midpoint = useRef(new THREE.Vector3());
  /** Eased 0 → 1 as the opened province comes apart. */
  const burst = useRef(0);
  const narrowRef = useRef(false);
  const [hoverDistrict, setHoverDistrict] = useState<string | null>(null);
  const hoverDistrictRef = useRef<string | null>(null);
  hoverDistrictRef.current = hoverDistrict;
  const districtRef = useRef<string | null>(district);
  districtRef.current = district;
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const active = METRICS.find((m) => m.id === metric)!;
  const [failed, setFailed] = useState(false);

  const scales = useMemo(() => {
    const values = PROVINCE_ORDER.map((c) => valueOf(c, metric) ?? 0);
    const max = Math.max(1, ...values);
    return PROVINCE_ORDER.reduce(
      (acc, code) => {
        const v = valueOf(code, metric);
        acc[code] = v === null || v <= 0 ? BASE : BASE + (v / max) * MAX_HEIGHT;
        return acc;
      },
      {} as Record<ProvinceCode, number>,
    );
  }, [metric]);

  const colours = useMemo(() => {
    const ramp = dark ? RAMP_DARK : RAMP_LIGHT;
    const values = PROVINCE_ORDER.map((c) => valueOf(c, metric) ?? 0);
    const max = Math.max(1, ...values);
    return PROVINCE_ORDER.reduce(
      (acc, code) => {
        const v = valueOf(code, metric);
        if (v === null || v <= 0) {
          acc[code] = ramp[0];
        } else {
          // Square-rooted only for the colour step, so small provinces stay
          // distinguishable from empty ones. Height remains linear.
          const t = Math.sqrt(v / max);
          acc[code] =
            ramp[
              Math.min(ramp.length - 1, 1 + Math.floor(t * (ramp.length - 1)))
            ];
        }
        return acc;
      },
      {} as Record<ProvinceCode, string>,
    );
  }, [metric, dark]);

  // Build once. Metric and theme changes mutate the existing objects.
  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    let gl: THREE.WebGLRenderer;
    try {
      gl = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    gl.setSize(el.clientWidth, el.clientHeight);
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(gl.domElement);
    renderer.current = gl;

    const sc = new THREE.Scene();
    scene.current = sc;

    const narrow = el.clientWidth < 640;
    const cam = new THREE.PerspectiveCamera(
      narrow ? 48 : 38,
      el.clientWidth / el.clientHeight,
      1,
      800,
    );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // A portrait canvas is constrained horizontally, so stand further back.
    const pull = narrow ? 1.18 : 1;
    cam.position.copy(reduced ? INTRO_TO : INTRO_FROM).multiplyScalar(pull);
    if (!reduced) intro.current = performance.now();
    camera.current = cam;

    const orbit = new OrbitControls(cam, gl.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.075;
    orbit.minDistance = 42;
    orbit.maxDistance = 210;
    orbit.minPolarAngle = 0.15;
    orbit.maxPolarAngle = 1.35;
    orbit.enablePan = false;
    orbit.target.set(0, 0, 0);
    controls.current = orbit;

    sc.add(new THREE.AmbientLight(0xffffff, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-60, 110, 70);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 320;
    const d = 95;
    Object.assign(key.shadow.camera, {
      left: -d,
      right: d,
      top: d,
      bottom: -d,
    });
    key.shadow.bias = -0.0012;
    sc.add(key);

    const rim = new THREE.DirectionalLight(0xffe9d6, 0.75);
    rim.position.set(70, 40, -60);
    sc.add(rim);

    // Shadow-catching ground, invisible except for what falls on it.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    sc.add(ground);

    const built: ProvinceObject[] = [];

    // Centres and the country extent come straight from the projected rings.
    // Reading them back off the built geometry proved unreliable.
    const extent = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    for (const shape of PROVINCE_SHAPES) {
      const rings = projectedRings(shape.geometry);

      const bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
      };
      for (const ring of rings) {
        for (const [x, y] of ring.outer) {
          if (x < bounds.minX) bounds.minX = x;
          if (x > bounds.maxX) bounds.maxX = x;
          if (y < bounds.minY) bounds.minY = y;
          if (y > bounds.maxY) bounds.maxY = y;
        }
      }
      extent.minX = Math.min(extent.minX, bounds.minX);
      extent.maxX = Math.max(extent.maxX, bounds.maxX);
      extent.minY = Math.min(extent.minY, bounds.minY);
      extent.maxY = Math.max(extent.maxY, bounds.maxY);
      const shapes = rings.map(({ outer, holes }) => {
        const s = new THREE.Shape(
          outer.map(([x, y]) => new THREE.Vector2(x, y)),
        );
        for (const hole of holes) {
          s.holes.push(
            new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))),
          );
        }
        return s;
      });

      // Extrude one unit deep and scale on Y, so switching metric is a tween
      // rather than a rebuild.
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth: 1,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 1,
      });
      geometry.rotateX(-Math.PI / 2);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colours[shape.code]),
        roughness: 0.5,
        metalness: 0.12,
        flatShading: false,
        transparent: true,
        opacity: 1,
      });

      // A ring that still triangulates to NaN is dropped rather than shipped.
      const position = geometry.getAttribute("position");
      let broken = false;
      for (let i = 0; i < position.count * 3 && !broken; i++) {
        if (Number.isNaN(position.array[i])) broken = true;
      }
      if (broken) {
        geometry.dispose();
        material.dispose();
        continue;
      }

      const solid = new THREE.Mesh(geometry, material);
      solid.castShadow = true;
      solid.receiveShadow = true;
      solid.userData.code = shape.code;

      const edges = new THREE.EdgesGeometry(geometry, 24);
      const outline = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 }),
      );

      const holder = new THREE.Group();
      holder.add(solid, outline);
      holder.scale.y = BASE;
      sc.add(holder);

      built.push({
        code: shape.code,
        group: holder,
        solid,
        outline,
        // The scene is Y-up, so the ring's Y becomes Z.
        top: new THREE.Vector3(
          (bounds.minX + bounds.maxX) / 2,
          1,
          -(bounds.minY + bounds.maxY) / 2,
        ),
        targetScale: BASE,
        currentScale: BASE,
      });
    }

    // Centre the country on the origin so the camera frames it without guesswork.
    const midX = (extent.minX + extent.maxX) / 2;
    const midZ = -(extent.minY + extent.maxY) / 2;
    midpoint.current.set(midX, 0, midZ);
    for (const o of built) {
      o.group.position.x = -midX;
      o.group.position.z = -midZ;
      o.top.set(o.top.x - midX, o.top.y, o.top.z - midZ);
    }

    objects.current = built;

    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      narrowRef.current = w < 640;
      cam.aspect = w / h;
      cam.fov = w < 640 ? 48 : 38;
      cam.updateProjectionMatrix();
      gl.setSize(w, h);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(el);

    const onPointerMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const tip = tipRef.current;
      if (tip) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        tip.style.transform = `translate3d(${x + 18}px, ${y + 18}px, 0)${
          x > rect.width - 260 ? " translateX(-100%) translateX(-36px)" : ""
        }`;
      }
    };
    const onLeave = () => pointer.current.set(-2, -2);
    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerleave", onLeave);

    const introPull = pull;
    let frame = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.12);

      const now = performance.now();

      if (intro.current !== null) {
        const t = Math.min(1, (now - intro.current) / 1400);
        cam.position
          .lerpVectors(INTRO_FROM, INTRO_TO, 1 - Math.pow(1 - t, 4))
          .multiplyScalar(introPull);
        if (t >= 1) intro.current = null;
      }

      const open = selectedRef.current;
      burst.current += ((open ? 1 : 0) - burst.current) * Math.min(1, dt * 3.6);
      const b = burst.current;
      const easedBurst = b * b * (3 - 2 * b);

      // Once a province is open the pick target is its districts, not the country.
      raycaster.current.setFromCamera(pointer.current, cam);
      const pickable = open
        ? (districts.current.get(open) ?? []).map((d) => d.solid)
        : objects.current.map((o) => o.solid);
      const hits = raycaster.current.intersectObjects(pickable, false);
      const picked = hits[0]?.object.userData as
        { code?: ProvinceCode; id?: string } | undefined;

      const hitCode = open ? null : (picked?.code ?? null);
      const hitDistrict = open ? (picked?.id ?? null) : null;
      setHover((prev) => (prev === hitCode ? prev : hitCode));
      setHoverDistrict((prev) => (prev === hitDistrict ? prev : hitDistrict));

      for (const o of objects.current) {
        const isSelected = selectedRef.current === o.code;
        const isHovered = hitCode === o.code;
        const dimmed = selectedRef.current !== null && !isSelected;

        const lift = isHovered && !dimmed && !reduced ? 1.6 : 0;
        o.group.position.y +=
          (lift - o.group.position.y) * Math.min(1, dt * 10);

        // The rest of the country drops to a flat plate; the opened province
        // hands over to its districts as the burst runs.
        const wantScale = dimmed ? GHOST : o.targetScale;
        o.currentScale +=
          (wantScale - o.currentScale) * (reduced ? 1 : Math.min(1, dt * 4.5));
        o.group.scale.y = o.currentScale;
        o.group.visible = !(isSelected && easedBurst > 0.04);

        o.solid.castShadow = !dimmed;

        const material = o.solid.material as THREE.MeshStandardMaterial;
        const wantOpacity = dimmed ? 0.34 : 1;
        material.opacity +=
          (wantOpacity - material.opacity) * Math.min(1, dt * 6);
        const emissive = isSelected ? 0.09 : isHovered && !dimmed ? 0.14 : 0;
        material.emissive.set(
          new THREE.Color(isSelected ? "#b3491a" : "#ffffff").multiplyScalar(
            emissive,
          ),
        );

        const line = o.outline.material as THREE.LineBasicMaterial;
        line.opacity +=
          ((dimmed ? 0 : isSelected ? 0.5 : 0.22) - line.opacity) *
          Math.min(1, dt * 6);
        line.color.set(
          isSelected ? "#b3491a" : darkRef.current ? "#cfd4c4" : "#2a3320",
        );
      }

      for (const [code, list] of districts.current) {
        const showing = open === code;
        for (const piece of list) {
          piece.group.visible = showing && easedBurst > 0.02;
          if (!piece.group.visible) continue;

          const isPicked = districtRef.current === piece.id;
          const isHovered = hitDistrict === piece.id;
          const muted = districtRef.current !== null && !isPicked;

          // Stagger: each district starts its flight a little after the last,
          // so the burst reads as one motion rather than several.
          const staged = Math.max(
            0,
            Math.min(
              1,
              (easedBurst - piece.order * 0.05) /
                Math.max(0.2, 1 - piece.order * 0.05),
            ),
          );
          const eased = 1 - Math.pow(1 - staged, 3);

          // A phone has a strip of map, not a stage: the burst travels less far
          // and rises less, or it climbs straight out of view.
          const spread = SPREAD;
          const climb = narrowRef.current ? LIFT * 0.7 : LIFT;
          const reach = eased * spread * (isPicked ? 1.25 : 1);
          piece.reach = reach;

          piece.group.position.x = -midpoint.current.x + piece.away.x * reach;
          piece.group.position.z = -midpoint.current.z + piece.away.z * reach;

          const rise =
            eased * climb +
            (isHovered || isPicked ? (narrowRef.current ? 1.2 : 2.4) : 0);
          piece.group.position.y +=
            (rise - piece.group.position.y) * Math.min(1, dt * 9);

          piece.group.scale.y +=
            (scalesRef.current[code] - piece.group.scale.y) *
            Math.min(1, dt * 4.5);

          const material = piece.solid.material as THREE.MeshStandardMaterial;
          // Opacity only carries the fade-in. A half-transparent extrusion shows
          // its own inner walls and reads as glass, so a set-aside district is
          // muted by washing its colour toward the surface instead.
          material.opacity += (eased - material.opacity) * Math.min(1, dt * 7);
          material.color.lerpColors(
            new THREE.Color(coloursRef.current[code]),
            new THREE.Color(darkRef.current ? "#232d1e" : "#e9eee1"),
            muted ? 0.62 : 0,
          );
          material.emissive.set(
            new THREE.Color(isPicked ? "#b3491a" : "#ffffff").multiplyScalar(
              isPicked ? 0.14 : isHovered ? 0.16 : 0,
            ),
          );

          const line = piece.outline.material as THREE.LineBasicMaterial;
          const wanted = isPicked || isHovered ? 0.75 : 0.3;
          line.opacity += (wanted * eased - line.opacity) * Math.min(1, dt * 7);
          line.color.set(
            isPicked || isHovered
              ? "#b3491a"
              : darkRef.current
                ? "#cfd4c4"
                : "#2a3320",
          );
        }
      }

      if (flight.current) {
        // Both endpoints are fixed when the flight starts and interpolated
        // together, so nothing accumulates frame to frame.
        const f = flight.current;
        const t = reduced ? 1 : Math.min(1, (now - f.startedAt) / 900);
        const e = 1 - Math.pow(1 - t, 3);
        orbit.target.lerpVectors(f.targetFrom, f.targetTo, e);
        cam.position.lerpVectors(f.cameraFrom, f.cameraTo, e);
        if (t >= 1) flight.current = null;
      }

      orbit.update();
      gl.render(sc, cam);
      // Labels ride the geometry: written straight to the DOM, never through state.
      const width = gl.domElement.clientWidth;
      const height = gl.domElement.clientHeight;
      for (const o of objects.current) {
        const el = labelRefs.current.get(o.code);
        if (!el) continue;
        const world = new THREE.Vector3(
          o.top.x,
          o.currentScale + o.group.position.y + 1.6,
          o.top.z,
        ).project(cam);
        // Any open panel hides every label: the panel names the province, and a
        // label floating over its contact list reads as a stray control.
        const hidden = world.z > 1 || selectedRef.current !== null;
        el.style.transform = `translate3d(${((world.x + 1) / 2) * width}px, ${
          ((-world.y + 1) / 2) * height
        }px, 0) translate(-50%, -100%)`;
        el.style.opacity = hidden ? "0" : "1";
        el.style.pointerEvents = hidden ? "none" : "auto";
        el.tabIndex = hidden ? -1 : 0;
      }

      const openList = open ? districts.current.get(open) : null;
      for (const [id, node] of districtLabelRefs.current) {
        const piece = openList?.find((d) => d.id === id);
        if (!piece || !piece.group.visible) {
          node.style.opacity = "0";
          node.style.pointerEvents = "none";
          node.tabIndex = -1;
          continue;
        }
        const world = new THREE.Vector3(
          piece.centre.x + piece.away.x * piece.reach,
          piece.group.scale.y + piece.group.position.y + 1.4,
          piece.centre.z + piece.away.z * piece.reach,
        ).project(cam);
        const muted =
          districtRef.current !== null && districtRef.current !== piece.id;
        const behind = world.z > 1;
        node.style.transform = `translate3d(${((world.x + 1) / 2) * width}px, ${
          ((-world.y + 1) / 2) * height
        }px, 0) translate(-50%, -100%)`;
        node.style.opacity = behind
          ? "0"
          : muted
            ? "0.35"
            : String(Math.min(1, easedBurst * 1.4));
        node.style.pointerEvents = behind ? "none" : "auto";
        node.tabIndex = behind ? -1 : 0;
      }
    };

    setReady(true);
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerleave", onLeave);
      orbit.dispose();
      for (const o of built) {
        o.solid.geometry.dispose();
        (o.solid.material as THREE.Material).dispose();
        o.outline.geometry.dispose();
        (o.outline.material as THREE.Material).dispose();
      }
      ground.geometry.dispose();
      ground.material.dispose();
      key.shadow.dispose();
      gl.dispose();
      if (gl.domElement.parentNode === el) el.removeChild(gl.domElement);
    };
    // Built once on purpose; later changes are applied through the refs below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scalesRef = useRef(scales);
  scalesRef.current = scales;
  const coloursRef = useRef(colours);
  coloursRef.current = colours;

  useEffect(() => {
    for (const o of objects.current) o.targetScale = scales[o.code];
  }, [scales]);

  useEffect(() => {
    for (const o of objects.current) {
      (o.solid.material as THREE.MeshStandardMaterial).color.set(
        colours[o.code],
      );
    }
  }, [colours]);

  // Districts are extruded the first time their province is opened, then kept.
  useEffect(() => {
    const sc = scene.current;
    if (!sc || !selected || districts.current.has(selected)) return;

    const parent = objects.current.find((o) => o.code === selected);
    if (!parent) return;

    const list: DistrictPiece[] = [];

    for (const shape of DISTRICTS_BY_PROVINCE[selected]) {
      const made = buildPiece(shape.geometry, coloursRef.current[selected]);
      if (!made) continue;

      made.solid.userData.id = shape.id;
      made.group.position.set(-midpoint.current.x, 0, -midpoint.current.z);
      made.group.scale.y = scalesRef.current[selected];
      made.group.visible = false;
      sc.add(made.group);

      const centre = made.centre.clone().sub(midpoint.current);
      const away = centre.clone().sub(parent.top).setY(0);
      away.setLength(Math.max(0.35, Math.min(1, away.length() / 12)));

      list.push({
        id: shape.id,
        name: shape.name,
        group: made.group,
        solid: made.solid,
        outline: made.outline,
        centre,
        away,
        order: 0,
        reach: 0,
      });
    }

    // Flight order runs outward from the province centre.
    list
      .slice()
      .sort(
        (a, b) =>
          a.centre.distanceTo(parent.top) - b.centre.distanceTo(parent.top),
      )
      .forEach((piece, i) => {
        piece.order = i;
      });

    districts.current.set(selected, list);
  }, [selected]);

  // Fly to the selected province — or back out to the whole country.
  useEffect(() => {
    const orbit = controls.current;
    const cam = camera.current;
    if (!orbit || !cam) return;

    intro.current = null;
    setRotating(false);
    orbit.autoRotate = false;
    const object = selected
      ? objects.current.find((o) => o.code === selected)
      : null;
    if (selected && !object) return;

    // The detail panel stacks below the map on a phone rather than covering it,
    // so there is nothing to frame around: zoom in at every width. A narrow
    // canvas just needs more distance to hold the exploded spread.
    const narrow = window.innerWidth < 640;
    const zoomIn = Boolean(object);

    const targetTo =
      zoomIn && object
        ? new THREE.Vector3(
            object.top.x,
            Math.min(object.targetScale * 0.45, 9),
            object.top.z,
          )
        : new THREE.Vector3(0, 0, 0);

    // Keep the viewer's current angle; only the framing changes.
    const direction = cam.position.clone().sub(orbit.target);
    if (direction.lengthSq() < 1e-6) direction.set(-0.12, 0.62, 0.78);
    direction.normalize();

    // The detail panel covers the right of a wide viewport, so bias the framing
    // left to centre the province in what is actually visible.
    if (narrationOverlay && window.innerWidth > 1100) {
      // `direction` runs from the target to the camera, so its cross with up
      // points to the camera's left — negate it to push the framing left of centre.
      const left = new THREE.Vector3().crossVectors(
        direction,
        new THREE.Vector3(0, 1, 0),
      );
      if (left.lengthSq() > 1e-6)
        targetTo.addScaledVector(left.normalize(), narrationOverlay ? 18 : -13);
    }

    flight.current = {
      targetFrom: orbit.target.clone(),
      targetTo,
      cameraFrom: cam.position.clone(),
      cameraTo: targetTo
        .clone()
        .add(
          direction.multiplyScalar(
            zoomIn ? (narrow ? 118 : 92) : narrow ? 152 : 128,
          ),
        ),
      startedAt: performance.now(),
    };
  }, [selected, narrationOverlay]);

  const click = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (
        !start ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6
      )
        return;
      const gl = renderer.current;
      const cam = camera.current;
      if (!gl || !cam) return;
      const rect = gl.domElement.getBoundingClientRect();
      const location = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(location, cam);
      const hit = raycaster.current.intersectObjects(
        selectedRef.current
          ? (districts.current.get(selectedRef.current) ?? []).map(
              (d) => d.solid,
            )
          : objects.current.map((o) => o.solid),
        false,
      )[0];
      if (selectedRef.current) {
        const id = hit?.object.userData.id as string | undefined;
        onSelectDistrict(id && districtRef.current !== id ? id : null);
        return;
      }

      const code = hit?.object.userData.code as ProvinceCode | undefined;
      onSelect(code && selectedRef.current !== code ? code : null);
    },
    [onSelect, onSelectDistrict],
  );

  const changeView = (flat: boolean) => {
    const cam = camera.current;
    const orbit = controls.current;
    if (!cam || !orbit) return;
    intro.current = null;
    flight.current = null;
    setTopDown(flat);
    setRotating(false);
    orbit.autoRotate = false;
    orbit.target.set(0, 0, 0);
    cam.position.copy(flat ? new THREE.Vector3(0, 135, 0.1) : INTRO_TO);
    orbit.update();
  };

  const zoom = (factor: number) => {
    const cam = camera.current;
    const orbit = controls.current;
    if (!cam || !orbit) return;
    intro.current = null;
    flight.current = null;
    const offset = cam.position.clone().sub(orbit.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * factor,
        orbit.minDistance,
        orbit.maxDistance,
      ),
    );
    cam.position.copy(orbit.target).add(offset);
    orbit.update();
  };

  const districtName = useMemo(
    () =>
      selected && district
        ? (DISTRICTS_BY_PROVINCE[selected]
            .find((d) => d.id === district)
            ?.name.replace(/ (District|Metro)$/, "") ?? null)
        : null,
    [selected, district],
  );

  const hoveredDistrictName = useMemo(
    () =>
      selected && hoverDistrict
        ? (DISTRICTS_BY_PROVINCE[selected]
            .find((d) => d.id === hoverDistrict)
            ?.name.replace(/ (District|Metro)$/, "") ?? null)
        : null,
    [selected, hoverDistrict],
  );

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="max-w-measure text-sm text-muted">
          This browser could not start WebGL, so the 3D map is unavailable. The
          province figures and offices below work without it.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={mount}
        onPointerDown={(event) => {
          pointerStart.current = { x: event.clientX, y: event.clientY };
          intro.current = null;
          flight.current = null;
          setRotating(false);
          setTopDown(false);
          if (controls.current) controls.current.autoRotate = false;
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
        onClick={click}
        className={cx(
          "h-full w-full",
          hover ? "cursor-pointer" : "cursor-grab",
        )}
        role="application"
        aria-label="Three-dimensional map of South Africa. Province height and colour show the selected measure. Drag to orbit, scroll to zoom, click a province to open it."
      />

      <p className="scene-instructions">
        {selected
          ? hoveredDistrictName
            ? hoveredDistrictName
            : district
              ? `${districtName ?? "District"} · tap another block`
              : `${PROVINCES[selected].name} · tap a district block`
          : "Drag to orbit · select a province to explore"}
      </p>
      <div className="scene-controls" role="group" aria-label="3D map controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(0.8)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom(1.25)}>
          −
        </button>
        <button
          type="button"
          aria-pressed={topDown}
          onClick={() => changeView(!topDown)}
        >
          {topDown ? "3D view" : "Top view"}
        </button>
        <button
          type="button"
          aria-label={
            rotating ? "Pause map rotation" : "Rotate map automatically"
          }
          aria-pressed={rotating}
          onClick={() => {
            if (!controls.current) return;
            intro.current = null;
            flight.current = null;
            controls.current.autoRotate = !rotating;
            controls.current.autoRotateSpeed = 0.7;
            setRotating(!rotating);
          }}
        >
          {rotating ? "Pause" : "Rotate"}
        </button>
        <button
          type="button"
          aria-label="Reset map view and selection"
          onClick={() => {
            onSelect(null);
            changeView(false);
          }}
        >
          Reset
        </button>
      </div>
      <div
        ref={tipRef}
        role="status"
        className={cx(
          "pointer-events-none absolute left-0 top-0 z-20 w-[15rem] border border-ink/15 bg-raised p-3 shadow-lg transition-opacity duration-150",
          hover && !selected ? "opacity-100" : "opacity-0",
        )}
      >
        {hover && (
          <>
            <p className="font-display text-lg leading-tight text-ink">
              {PROVINCES[hover].name}
            </p>
            <p className="mt-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{active.label}</span>
              <span className="num text-ink">
                {valueOf(hover, metric) === null
                  ? "—"
                  : metric === "share"
                    ? `${valueOf(hover, metric)}%`
                    : `${group(valueOf(hover, metric)!)} ha`}
              </span>
            </p>
            <p className="mt-2 border-t border-rule pt-1.5 text-2xs leading-snug text-muted">
              {PROVINCES[hover].commodities.slice(0, 3).join(" · ")} — click to
              open
            </p>
          </>
        )}
      </div>

      {PROVINCE_ORDER.map((code) => {
        const value = valueOf(code, metric);
        return (
          <button
            key={code}
            ref={(el) => {
              if (el) labelRefs.current.set(code, el);
              else labelRefs.current.delete(code);
            }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selected === code ? null : code);
            }}
            style={{ left: 0, top: 0, opacity: 0 }}
            className={cx(
              "scene-label absolute z-10 whitespace-nowrap border border-rule/70 bg-paper/80 px-1.5 py-0.5 text-center backdrop-blur-[2px] transition-opacity duration-200",
              ready ? "" : "invisible",
            )}
          >
            <span
              className={cx(
                "block font-display text-sm leading-none",
                selected === code || hover === code ? "text-clay" : "text-ink",
              )}
            >
              {PROVINCES[code].short}
            </span>
            <span className="num mt-0.5 block text-2xs leading-none text-muted">
              {value === null
                ? "—"
                : metric === "share"
                  ? `${value}%`
                  : group(value)}
            </span>
          </button>
        );
      })}

      {selected &&
        DISTRICTS_BY_PROVINCE[selected].map((d) => (
          <button
            key={d.id}
            ref={(el) => {
              if (el) districtLabelRefs.current.set(d.id, el);
              else districtLabelRefs.current.delete(d.id);
            }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectDistrict(district === d.id ? null : d.id);
            }}
            style={{ left: 0, top: 0, opacity: 0 }}
            className={cx(
              // Hidden on a phone: the panel lists the districts as tappable
              // chips, which beats labels colliding in a narrow strip.
              "scene-label absolute z-10 hidden whitespace-nowrap border px-1.5 py-0.5 text-center text-2xs backdrop-blur-[2px] transition-colors duration-150 sm:block",
              district === d.id || hoverDistrict === d.id
                ? "border-clay bg-clay text-paper"
                : "border-rule/70 bg-paper/85 text-ink",
            )}
          >
            {d.name.replace(/ (District|Metro)$/, "")}
          </button>
        ))}
    </div>
  );
}

/** Extrudes one polygon set into a unit-deep solid with its own outline. */
function buildPiece(
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon,
  colour: string,
): {
  group: THREE.Group;
  solid: THREE.Mesh;
  outline: THREE.LineSegments;
  centre: THREE.Vector3;
} | null {
  const rings = projectedRings(geometry);
  if (rings.length === 0) return null;

  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };
  for (const ring of rings) {
    for (const [x, y] of ring.outer) {
      if (x < bounds.minX) bounds.minX = x;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (y > bounds.maxY) bounds.maxY = y;
    }
  }
  if (!Number.isFinite(bounds.minX)) return null;

  const shapes = rings.map(({ outer, holes }) => {
    const shape = new THREE.Shape(
      outer.map(([x, y]) => new THREE.Vector2(x, y)),
    );
    for (const hole of holes) {
      shape.holes.push(
        new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))),
      );
    }
    return shape;
  });

  const solidGeometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 1,
  });
  solidGeometry.rotateX(-Math.PI / 2);

  // A ring that still triangulates to NaN is dropped rather than shipped.
  const position = solidGeometry.getAttribute("position");
  for (let i = 0; i < position.count * 3; i++) {
    if (Number.isNaN(position.array[i])) {
      solidGeometry.dispose();
      return null;
    }
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colour),
    roughness: 0.5,
    metalness: 0.12,
    transparent: true,
    opacity: 1,
  });

  const solid = new THREE.Mesh(solidGeometry, material);
  solid.castShadow = true;
  solid.receiveShadow = true;

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(solidGeometry, 24),
    new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 }),
  );

  const holder = new THREE.Group();
  holder.add(solid, outline);

  return {
    group: holder,
    solid,
    outline,
    // The scene is Y-up, so the ring's Y becomes Z.
    centre: new THREE.Vector3(
      (bounds.minX + bounds.maxX) / 2,
      0,
      -(bounds.minY + bounds.maxY) / 2,
    ),
  };
}
