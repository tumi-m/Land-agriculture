'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PROVINCE_SHAPES, projectedRings } from '@/lib/geo';
import { PROVINCES, PROVINCE_ORDER } from '@/content/provinces';
import { cx, group } from '@/lib/format';
import type { ProvinceCode } from '@/lib/types';

export type Metric = 'advertised' | 'released' | 'share';

export const METRICS: { id: Metric; label: string; unit: string; note: string }[] = [
  {
    id: 'advertised',
    label: 'Advertised',
    unit: 'ha',
    note: 'Hectares put out for lease in the October 2020 tranche.',
  },
  {
    id: 'released',
    label: 'Released',
    unit: 'ha',
    note: 'Hectares actually handed to producers in February 2020.',
  },
  {
    id: 'share',
    label: 'State land',
    unit: '%',
    note: 'Share of the province’s registered surface that the state already owns.',
  },
];

export function valueOf(code: ProvinceCode, metric: Metric): number | null {
  const p = PROVINCES[code];
  if (metric === 'advertised') return p.advertised2020;
  if (metric === 'released') return p.released2020;
  return p.stateLandSharePct;
}

const MAX_HEIGHT = 30;
const BASE = 0.6;

/** Where the camera arrives from, and where it settles. */
const INTRO_FROM = new THREE.Vector3(-10, 148, 60);
const INTRO_TO = new THREE.Vector3(-12, 74, 104);

/** Ramp steps as hex, matching the --land-* tokens so 2D and 3D agree. */
const RAMP_LIGHT = ['#e9eee1', '#d3dec5', '#bacaa6', '#a0b687', '#88a972', '#688f53', '#4f7540', '#2a4524'];
const RAMP_DARK = ['#232d1e', '#2e3f26', '#3b532f', '#4a6b39', '#5c8546', '#74a159', '#90bc77', '#b4d49e'];

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
  dark,
}: {
  metric: Metric;
  selected: ProvinceCode | null;
  onSelect: (code: ProvinceCode | null) => void;
  dark: boolean;
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

  const [hover, setHover] = useState<ProvinceCode | null>(null);
  const labelRefs = useRef(new Map<ProvinceCode, HTMLButtonElement>());
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
          acc[code] = ramp[Math.min(ramp.length - 1, 1 + Math.floor(t * (ramp.length - 1)))];
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
      gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
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

    const cam = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 1, 800);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cam.position.copy(reduced ? INTRO_TO : INTRO_FROM);
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
    Object.assign(key.shadow.camera, { left: -d, right: d, top: d, bottom: -d });
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
    const extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

    for (const shape of PROVINCE_SHAPES) {
      const rings = projectedRings(shape.geometry);

      const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
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
        const s = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
        for (const hole of holes) {
          s.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
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
        roughness: 0.82,
        metalness: 0.02,
        flatShading: false,
        transparent: true,
        opacity: 1,
      });

      // A ring that still triangulates to NaN is dropped rather than shipped.
      const position = geometry.getAttribute('position');
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
      cam.aspect = w / h;
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
          x > rect.width - 260 ? ' translateX(-100%) translateX(-36px)' : ''
        }`;
      }
    };
    const onLeave = () => pointer.current.set(-2, -2);
    gl.domElement.addEventListener('pointermove', onPointerMove);
    gl.domElement.addEventListener('pointerleave', onLeave);

    let frame = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.12);

      const now = performance.now();

      if (intro.current !== null) {
        const t = Math.min(1, (now - intro.current) / 1400);
        cam.position.lerpVectors(INTRO_FROM, INTRO_TO, 1 - Math.pow(1 - t, 4));
        if (t >= 1) intro.current = null;
      }

      raycaster.current.setFromCamera(pointer.current, cam);
      const hits = raycaster.current.intersectObjects(
        objects.current.map((o) => o.solid),
        false,
      );
      const hitCode = (hits[0]?.object.userData.code as ProvinceCode | undefined) ?? null;
      setHover((prev) => (prev === hitCode ? prev : hitCode));

      for (const o of objects.current) {
        const isSelected = selectedRef.current === o.code;
        const isHovered = hitCode === o.code;
        const dimmed = selectedRef.current !== null && !isSelected;

        const lift = isHovered && !dimmed ? 1.6 : 0;
        o.group.position.y += (lift - o.group.position.y) * Math.min(1, dt * 10);

        o.currentScale += (o.targetScale - o.currentScale) * Math.min(1, dt * 4.5);
        o.group.scale.y = o.currentScale;

        o.solid.castShadow = !dimmed;

        const material = o.solid.material as THREE.MeshStandardMaterial;
        const wantOpacity = dimmed ? 0.28 : 1;
        material.opacity += (wantOpacity - material.opacity) * Math.min(1, dt * 6);
        const emissive = isSelected ? 0.09 : isHovered && !dimmed ? 0.14 : 0;
        material.emissive.set(
          new THREE.Color(isSelected ? '#b3491a' : '#ffffff').multiplyScalar(emissive),
        );

        const line = o.outline.material as THREE.LineBasicMaterial;
        line.opacity += ((dimmed ? 0 : isSelected ? 0.5 : 0.22) - line.opacity) * Math.min(1, dt * 6);
        line.color.set(isSelected ? '#b3491a' : darkRef.current ? '#cfd4c4' : '#2a3320');
      }

      if (flight.current) {
        // Both endpoints are fixed when the flight starts and interpolated
        // together, so nothing accumulates frame to frame.
        const f = flight.current;
        const t = Math.min(1, (now - f.startedAt) / 900);
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
        const behind = world.z > 1;
        const dimmed = selectedRef.current !== null && selectedRef.current !== o.code;
        el.style.transform = `translate3d(${((world.x + 1) / 2) * width}px, ${
          ((-world.y + 1) / 2) * height
        }px, 0) translate(-50%, -100%)`;
        el.style.opacity = behind || dimmed ? '0' : '1';
        el.style.pointerEvents = behind || dimmed ? 'none' : 'auto';
      }
    };

    setReady(true);
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.domElement.removeEventListener('pointermove', onPointerMove);
      gl.domElement.removeEventListener('pointerleave', onLeave);
      orbit.dispose();
      for (const o of built) {
        o.solid.geometry.dispose();
        (o.solid.material as THREE.Material).dispose();
        o.outline.geometry.dispose();
        (o.outline.material as THREE.Material).dispose();
      }
      gl.dispose();
      if (gl.domElement.parentNode === el) el.removeChild(gl.domElement);
    };
    // Built once on purpose; later changes are applied through the refs below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const o of objects.current) o.targetScale = scales[o.code];
  }, [scales]);

  useEffect(() => {
    for (const o of objects.current) {
      (o.solid.material as THREE.MeshStandardMaterial).color.set(colours[o.code]);
    }
  }, [colours]);

  // Fly to the selected province — or back out to the whole country.
  useEffect(() => {
    const orbit = controls.current;
    const cam = camera.current;
    if (!orbit || !cam) return;

    const object = selected ? objects.current.find((o) => o.code === selected) : null;
    if (selected && !object) return;

    const targetTo = object
      ? new THREE.Vector3(object.top.x, Math.min(object.targetScale * 0.45, 9), object.top.z)
      : new THREE.Vector3(0, 0, 0);

    // Keep the viewer's current angle; only the framing changes.
    const direction = cam.position.clone().sub(orbit.target);
    if (direction.lengthSq() < 1e-6) direction.set(-0.12, 0.62, 0.78);
    direction.normalize();

    // The detail panel covers the right of the viewport on wide screens, so shift
    // the framing to centre the province in what is actually visible.
    if (object && window.innerWidth >= 640) {
      // `direction` runs from the target to the camera, so its cross with up
      // points to the camera's left — negate it to push the framing left of centre.
      const left = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
      if (left.lengthSq() > 1e-6) targetTo.addScaledVector(left.normalize(), -13);
    }

    flight.current = {
      targetFrom: orbit.target.clone(),
      targetTo,
      cameraFrom: cam.position.clone(),
      cameraTo: targetTo.clone().add(direction.multiplyScalar(selected ? 76 : 128)),
      startedAt: performance.now(),
    };
  }, [selected]);

  const click = useCallback(() => {
    onSelect(hover && selectedRef.current !== hover ? hover : null);
  }, [hover, onSelect]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="max-w-measure text-sm text-muted">
          This browser could not start WebGL, so the 3D map is unavailable. The province figures and
          offices below work without it.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={mount}
        onClick={click}
        className={cx('h-full w-full', hover ? 'cursor-pointer' : 'cursor-grab')}
        role="application"
        aria-label="Three-dimensional map of South Africa. Province height and colour show the selected measure. Drag to orbit, scroll to zoom, click a province to open it."
      />

      <div
        ref={tipRef}
        role="status"
        className={cx(
          'pointer-events-none absolute left-0 top-0 z-20 w-[15rem] border border-ink/15 bg-raised p-3 shadow-lg transition-opacity duration-150',
          hover && !selected ? 'opacity-100' : 'opacity-0',
        )}
      >
        {hover && (
          <>
            <p className="font-display text-lg leading-tight text-ink">{PROVINCES[hover].name}</p>
            <p className="mt-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{active.label}</span>
              <span className="num text-ink">
                {valueOf(hover, metric) === null
                  ? '—'
                  : metric === 'share'
                    ? `${valueOf(hover, metric)}%`
                    : `${group(valueOf(hover, metric)!)} ha`}
              </span>
            </p>
            <p className="mt-2 border-t border-rule pt-1.5 text-2xs leading-snug text-muted">
              {PROVINCES[hover].commodities.slice(0, 3).join(' · ')} — click to open
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
              'absolute z-10 whitespace-nowrap border border-rule/70 bg-paper/80 px-1.5 py-0.5 text-center backdrop-blur-[2px] transition-opacity duration-200',
              ready ? '' : 'invisible',
            )}
          >
            <span
              className={cx(
                'block font-display text-sm leading-none',
                selected === code || hover === code ? 'text-clay' : 'text-ink',
              )}
            >
              {PROVINCES[code].short}
            </span>
            <span className="num mt-0.5 block text-2xs leading-none text-muted">
              {value === null ? '—' : metric === 'share' ? `${value}%` : group(value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
