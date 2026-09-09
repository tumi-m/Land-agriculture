"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  applyRelief,
  DEM_ATTRIBUTION,
  loadDem,
  RELIEF_EXAGGERATION,
  surfacePoint,
} from "@/lib/dem";
import RIVERS from "@/data/sa-rivers.json";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  PROVINCE_SHAPES,
  DISTRICTS_BY_PROVINCE,
  projectedRings,
} from "@/lib/geo";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import {
  LAND_LAYERS,
  noticesForDistrict,
  noticeCountLabel,
  explosionOffset,
  sliceHeight,
  modelDistance,
  spacedLabels,
  type LandLayer,
} from "@/lib/exploded-map";
import { FARM_NOTICES, type FarmNotice } from "@/content/farm-notices";
import GovernmentNotices from "./GovernmentNotices";
import type { ProvinceCode } from "@/lib/types";

type Piece = {
  id: string;
  province: ProvinceCode;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  centre: THREE.Vector3;
  size: THREE.Vector3;
  anchor: THREE.Vector3;
  /** World centre before re-centring — needed to map vertices back to lon/lat. */
  origin: THREE.Vector3;
};
/** Slab thickness in world units; relief is measured against it. */
export const EXTRUDE_DEPTH = 0.6;

export function makePiece(
  id: string,
  province: ProvinceCode,
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  stack: boolean,
): Piece {
  const shapes = projectedRings(geometry).map(({ outer, holes }) => {
    const shape = new THREE.Shape(
      outer.map(([x, y]) => new THREE.Vector2(x, y)),
    );
    for (const hole of holes)
      shape.holes.push(
        new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))),
      );
    return shape;
  });
  const geometry3d = new THREE.ExtrudeGeometry(shapes, {
    depth: EXTRUDE_DEPTH,
    bevelEnabled: true,
    bevelSize: 0.07,
    bevelThickness: 0.06,
    bevelSegments: 2,
  });
  geometry3d.rotateX(-Math.PI / 2);
  geometry3d.computeBoundingBox();
  const box = geometry3d.boundingBox!;
  const centre = box.getCenter(new THREE.Vector3());
  centre.y = 0;
  const size = box.getSize(new THREE.Vector3());
  geometry3d.translate(-centre.x, 0, -centre.z);
  const group = new THREE.Group();
  group.position.copy(centre);
  const meshes = (stack ? LAND_LAYERS : [LAND_LAYERS[0]]).map((layer, i) => {
    const material = new THREE.MeshStandardMaterial({
      color: layer.colour,
      roughness: 0.65,
      metalness: 0.12,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry3d, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = stack ? sliceHeight(i, 0) : 0;
    mesh.userData = { id, province, layer: layer.id };
    group.add(mesh);
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry3d, 25),
      new THREE.LineBasicMaterial({
        color: layer.colour,
        transparent: true,
        opacity: 0.65,
      }),
    );
    mesh.add(line);
    return mesh;
  });
  return {
    id,
    province,
    group,
    meshes,
    centre,
    size,
    anchor: centre.clone(),
    origin: centre.clone(),
  };
}
export default function ExplodedMap({
  selected,
  district,
  onSelect,
  onSelectDistrict,
  onNotice,
  onTerrain,
}: {
  selected: ProvinceCode | null;
  district: string | null;
  onSelect: (p: ProvinceCode | null) => void;
  onSelectDistrict: (d: string | null) => void;
  onNotice: (n: FarmNotice) => void;
  onTerrain: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    labels = useRef(new Map<string, HTMLButtonElement>()),
    sliceLabels = useRef(new Map<string, HTMLButtonElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const [infoOpen, setInfoOpen] = useState(!!district);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [explode, setExplode] = useState(0.72),
    [peel, setPeel] = useState(0.82),
    [layer, setLayer] = useState<LandLayer>("opportunity"),
    [hidden, setHidden] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [relief, setRelief] = useState(false),
    [water, setWater] = useState(false),
    [failed, setFailed] = useState(false),
    [auto, setAuto] = useState(false),
    [hover, setHover] = useState("");
  const latest = useRef({
    selected,
    district,
    explode,
    peel,
    hidden,
    onSelect,
    onSelectDistrict,
    layer,
  });
  latest.current = {
    selected,
    district,
    explode,
    peel,
    hidden,
    onSelect,
    onSelectDistrict,
    layer,
  };
  const world = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    provinces: Piece[];
    districts: Piece[];
    frame: () => void;
  } | null>(null);
  const layerMeta = LAND_LAYERS.find((l) => l.id === layer)!;
  const districtShape = selected
    ? DISTRICTS_BY_PROVINCE[selected].find((d) => d.id === district)
    : null;
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
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // Keep all geographic context crisp at every zoom level.
    const camera = new THREE.PerspectiveCamera(
      38,
      el.clientWidth / el.clientHeight,
      0.1,
      1200,
    );
    camera.position.set(0, 110, 135);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 700;
    controls.maxPolarAngle = 1.35;
    controls.minPolarAngle = 0.15;
    controls.enablePan = true;
    scene.add(new THREE.HemisphereLight("#d8fff1", "#35424d", 2.2));
    const sun = new THREE.DirectionalLight("#fff4db", 3);
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
    const rim = new THREE.DirectionalLight("#73dbe0", 2);
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

    // Relief arrives after the map does. The slabs draw flat straight away and
    // lift onto the real land surface once the elevation grid resolves, so a
    // slow connection costs detail rather than a wait — and a failed fetch just
    // leaves the map as it was.
    let reliefCancelled = false;
    const waterGroup = new THREE.Group();
    scene.add(waterGroup);

    void loadDem().then((dem) => {
      if (!dem || reliefCancelled) return;

      // The major rivers, draped on the land surface. Six lines from Natural
      // Earth — the Orange, Vaal, Limpopo and Okavango — which is what the
      // irrigation schemes in the dossiers actually draw from.
      for (const feature of RIVERS.features) {
        const coordinates = feature.geometry.coordinates as unknown;
        const parts: [number, number][][] =
          feature.geometry.type === "MultiLineString"
            ? (coordinates as [number, number][][])
            : [coordinates as [number, number][]];
        for (const line of parts) {
          const points = line.map(([lon, lat]) =>
            surfacePoint(dem, lon, lat, EXTRUDE_DEPTH + 0.06).sub(centre),
          );
          if (points.length < 2) continue;
          waterGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(points),
              new THREE.LineBasicMaterial({
                color: "#5fb8d6",
                transparent: true,
                opacity: 0.85,
              }),
            ),
          );
        }
      }
      setWater(true);
      for (const piece of [...provinces, ...districts]) {
        const geometry = piece.meshes[0].geometry;
        applyRelief(geometry, dem, EXTRUDE_DEPTH, piece.origin);
        for (const mesh of piece.meshes) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          material.vertexColors = true;
          material.needsUpdate = true;
        }
        // The outlines snapshot the geometry, so they have to be rebuilt.
        for (const mesh of piece.meshes) {
          for (const child of mesh.children) {
            if (child instanceof THREE.LineSegments) {
              child.geometry.dispose();
              child.geometry = new THREE.EdgesGeometry(geometry, 25);
            }
          }
        }
      }
      setRelief(true);
    });
    const footprints = provinces.map((p) => {
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(p.meshes[0].geometry, 25),
        new THREE.LineBasicMaterial({
          color: "#a1cdb9",
          transparent: true,
          opacity: 0.4,
        }),
      );
      outline.position.copy(p.centre);
      outline.position.y = -0.2;
      scene.add(outline);
      return { id: p.id, outline };
    });
    const tethers = districts.map((p) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        p.centre,
        p.centre,
      ]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineDashedMaterial({
          color: "#96b9a7",
          transparent: true,
          opacity: 0.32,
          dashSize: 0.5,
          gapSize: 0.5,
        }),
      );
      scene.add(line);
      return { piece: p, line };
    });
    const grid = new THREE.GridHelper(220, 22, "#24404a", "#182f37");
    grid.position.y = -1.2;
    scene.add(grid);
    const ray = new THREE.Raycaster(),
      mouse = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | null = null;
    let moving = false;
    let hovering: THREE.Mesh | null = null;
    let raf = 0;
    let previous = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flight: {
      from: THREE.Vector3;
      to: THREE.Vector3;
      targetFrom: THREE.Vector3;
      targetTo: THREE.Vector3;
      time: number;
    } | null = null;
    const frame = () => {
      const { selected, district } = latest.current;
      const parent = provinces.find((p) => p.id === selected);
      const child = districts.find(
        (p) => p.id === district && p.province === selected,
      );
      const target = (child ?? parent)?.centre.clone() ?? new THREE.Vector3();
      if (child && parent) {
        const offset = explosionOffset(
          [child.centre.x, child.centre.z],
          [parent.centre.x, parent.centre.z],
          latest.current.explode,
        );
        target.x += offset[0];
        target.z += offset[1];
      }
      target.y = child ? 12 : parent ? 5 : 0;
      const size =
        (child ?? parent)?.size ?? allBox.getSize(new THREE.Vector3());
      const span = Math.max(size.x + 30, size.z + 30, child ? 48 : 0);
      const aspect = Math.min(camera.aspect, 1.4);
      const distance = modelDistance(span, aspect, camera.fov);
      const direction = new THREE.Vector3(-0.18, 0.83, 1).normalize();
      flight = {
        from: camera.position.clone(),
        to: target.clone().addScaledVector(direction, distance),
        targetFrom: controls.target.clone(),
        targetTo: target,
        time: performance.now(),
      };
    };
    world.current = { renderer, camera, controls, provinces, districts, frame };
    const getHit = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(mouse, camera);
      const { selected } = latest.current;
      return ray.intersectObjects(
        (selected
          ? districts.filter((d) => d.province === selected)
          : provinces
        ).flatMap((p) => p.meshes.filter((m) => m.visible)),
        false,
      )[0];
    };
    const down = (e: PointerEvent) => {
      pointerStart = { x: e.clientX, y: e.clientY };
      moving = false;
      flight = null;
      controls.autoRotate = false;
      setAuto(false);
    };
    const move = (e: PointerEvent) => {
      if (
        pointerStart &&
        Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6
      )
        moving = true;
      if (e.pointerType === "touch") return;
      hovering = (getHit(e)?.object as THREE.Mesh) ?? null;
      el.style.cursor = hovering ? "pointer" : "grab";
      setHover(hovering?.userData.id ?? "");
    };
    const up = (e: PointerEvent) => {
      if (
        !pointerStart ||
        moving ||
        Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6
      ) {
        pointerStart = null;
        return;
      }
      pointerStart = null;
      const hit = getHit(e);
      if (!hit) return;
      const d = hit.object.userData;
      if (latest.current.selected) {
        if (latest.current.district !== d.id) {
          setHidden([]);
          setPeel(0.82);
        }
        latest.current.onSelectDistrict(d.id);
        setLayer(d.layer);
        setInfoOpen(true);
        setControlsOpen(false);
      } else latest.current.onSelect(d.province);
    };
    const cancel = () => {
      pointerStart = null;
      hovering = null;
      setHover("");
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    renderer.domElement.addEventListener("pointerleave", cancel);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    });
    resize.observe(el);
    const project = (
      node: HTMLButtonElement | undefined,
      p: THREE.Vector3,
      visible: boolean,
    ) => {
      if (!node) return;
      const projected = p.clone().project(camera);
      visible = visible && projected.z < 1 && projected.z > -1;
      node.style.transform = `translate(${((projected.x + 1) / 2) * el.clientWidth}px,${((1 - projected.y) / 2) * el.clientHeight}px) translate(-50%,-100%)`;
      node.style.opacity = visible ? "1" : "0";
      node.style.pointerEvents = visible ? "auto" : "none";
      node.tabIndex = visible ? 0 : -1;
    };
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now(),
        dt = Math.min((now - previous) / 1000, 0.08);
      previous = now;
      const speed = reduced ? 1 : Math.min(1, dt * 7);
      const state = latest.current;
      for (const p of provinces) {
        const muted = !!state.selected;
        p.group.visible = p.id !== state.selected;
        p.group.position.y = 0;
        const material = p.meshes[0].material as THREE.MeshStandardMaterial;
        material.opacity = 1;
        material.color.set(
          muted
            ? "#729f92"
            : p.id === hovering?.userData.id
              ? "#d5eea2"
              : "#729f92",
        );
        project(
          labels.current.get(p.id),
          p.centre.clone().setY(3),
          !state.selected,
        );
      }
      for (const f of footprints) f.outline.visible = f.id === state.selected;
      const parent = provinces.find((p) => p.id === state.selected);
      for (const p of districts) {
        p.group.visible = p.province === state.selected;
        if (!p.group.visible) {
          project(labels.current.get(p.id), p.centre, false);
          continue;
        }
        const chosen = p.id === state.district;
        const offset = explosionOffset(
          [p.centre.x, p.centre.z],
          [parent!.centre.x, parent!.centre.z],
          state.explode,
        );
        const target = p.centre
          .clone()
          .add(new THREE.Vector3(offset[0], chosen ? 7 : 3, offset[1]));
        p.group.position.lerp(target, speed);
        p.meshes.forEach((m, i) => {
          m.visible = !chosen || !state.hidden.includes(LAND_LAYERS[i].id);
          m.position.y +=
            (sliceHeight(i, chosen ? state.peel : 0) - m.position.y) * speed;
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
        project(labels.current.get(p.id), p.anchor, !state.district || chosen);
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
            const labelX = Math.max(8, Math.min(x - 210, el.clientWidth - 220));
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
      for (const { piece, line } of tethers) {
        line.visible =
          piece.province === state.selected && state.explode > 0.03;
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
        const t = reduced ? 1 : Math.min(1, (now - flight.time) / 1000),
          e = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(flight.from, flight.to, e);
        controls.target.lerpVectors(flight.targetFrom, flight.targetTo, e);
        if (t === 1) flight = null;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    frame();
    setReady(true);
    animate();
    return () => {
      reliefCancelled = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("pointerleave", cancel);
      const geometry = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) geometry.add(mesh.geometry);
        if (mesh.material)
          (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).forEach((m) => materials.add(m));
      });
      geometry.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      world.current = null;
    };
  }, []);
  useEffect(() => {
    world.current?.frame();
  }, [selected, district]);
  const zoom = (factor: number) => {
    const w = world.current;
    if (!w) return;
    const offset = w.camera.position
      .clone()
      .sub(w.controls.target)
      .multiplyScalar(factor);
    offset.setLength(THREE.MathUtils.clamp(offset.length(), 20, 700));
    w.camera.position.copy(w.controls.target).add(offset);
  };
  const chooseDistrict = (id: string) => {
    setHidden([]);
    setInfoOpen(true);
    setControlsOpen(false);
    onSelectDistrict(id);
    setPeel(0.82);
  };
  return (
    <div className="anatomy-stage">
      <p className="anatomy-source" role="status">
        {relief
          ? `Land surface from real elevation, vertical scale ×${RELIEF_EXAGGERATION}${
              water ? " · major rivers shown" : ""
            } · ${DEM_ATTRIBUTION}`
          : "Loading the land surface…"}
      </p>
      <div
        ref={host}
        className="anatomy-canvas"
        role="img"
        aria-label="Exploded 3D map. Use the named region buttons or region selector to explore; drag to orbit and pinch to zoom."
      />
      {!ready && !failed && (
        <div className="anatomy-loading">Assembling the land…</div>
      )}
      {failed && (
        <div className="anatomy-loading">
          <p>3D rendering is unavailable on this device.</p>
          <button onClick={onTerrain}>Open terrain map</button>
        </div>
      )}
      <div className="anatomy-breadcrumb">
        <button onClick={() => onSelect(null)}>South Africa</button>
        {selected && (
          <>
            <span>/</span>
            <button onClick={() => onSelectDistrict(null)}>
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
        <p>EXPLORE THE LAND, LAYER BY LAYER</p>
        <h2>
          {districtShape
            ? "Inside the region."
            : selected
              ? "Pull the province apart."
              : "A country you can open."}
        </h2>
        <span>
          {districtShape
            ? "Select a floating layer to inspect it."
            : selected
              ? "Choose a district to separate its information layers."
              : "Select a province to lift out its districts."}
        </span>
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
          onClick={() => world.current?.frame()}
        >
          ⌖
        </button>
        <button
          aria-pressed={auto}
          onClick={() => {
            const w = world.current;
            if (w) {
              w.controls.autoRotate = !auto;
              w.controls.autoRotateSpeed = 0.65;
              setAuto(!auto);
            }
          }}
        >
          {auto ? "Pause" : "Orbit"}
        </button>
      </div>
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
            selected ? chooseDistrict(p.id) : onSelect(p.id as ProvinceCode)
          }
        >
          {p.name.replace(/ District$/, "")}
          <small>
            {selected
              ? noticeCountLabel(noticesForDistrict(selected, p.id))
              : noticeCountLabel(
                  FARM_NOTICES.filter((n) => n.province === p.id),
                )}
          </small>
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
            setLayer(l.id);
            setInfoOpen(true);
            setControlsOpen(false);
          }}
        >
          <i style={{ background: l.colour }} />
          {String(i + 1).padStart(2, "0")} {l.name}
        </button>
      ))}
      {infoOpen && (
        <div className="anatomy-dossier" id="anatomy-layer-details">
          <div className="anatomy-dossier-head">
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
          {districtShape && <p>{layerMeta.description}</p>}
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
        </div>
      )}
      <div className="anatomy-mobile-dock">
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
      <div
        className={`anatomy-console ${controlsOpen ? "is-open" : ""}`}
        id="anatomy-region-controls"
      >
        <div className="anatomy-controls-heading">
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
                onSelect((e.target.value || null) as ProvinceCode | null)
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
                    : onSelectDistrict(null)
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
            Separate regions <b>{Math.round(explode * 100)}%</b>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={explode}
            disabled={!selected}
            onChange={(e) => setExplode(Number(e.target.value))}
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
                aria-pressed={!hidden.includes(l.id)}
                onClick={() =>
                  setHidden((v) =>
                    v.includes(l.id)
                      ? v.filter((x) => x !== l.id)
                      : [...v, l.id],
                  )
                }
              >
                <i style={{ background: l.colour }} />
                {l.name}
              </button>
            ))}
          </div>
        )}
        <button
          className="anatomy-reassemble"
          onClick={() => {
            if (explode === 0) {
              setExplode(0.72);
              setPeel(0.82);
            } else {
              setExplode(0);
              setPeel(0);
              setHidden([]);
              onSelectDistrict(null);
            }
          }}
        >
          {explode === 0 ? "Separate regions" : "Reassemble"}
        </button>
      </div>
      <p className="anatomy-footnote">
        Geographic shapes · thematic slices, not measured soil strata · drag to
        orbit · pinch to zoom
      </p>
    </div>
  );
}
