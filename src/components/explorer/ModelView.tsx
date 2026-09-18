"use client";
import { useEffect, useRef, useState } from "react";
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
import type { ProvinceCode } from "@/lib/types";
import { SCENE } from "@/design/ramps";
import { isolatedDistrict, useExplorer } from "@/state/explorer";
import {
  CAMERA_PRESETS,
  DEFAULT_PRESET,
  presetDirection,
  presetFor,
  visibleViewRegion,
  type CameraPresetId,
} from "@/scene/camera";
import { createSceneCore } from "@/scene/core";
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
import { clampLabelX, projectToScreen } from "@/scene/labels";

/** How long the camera flight to a new selection takes. */
const FLIGHT_MS = 1000;
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

  const host = useRef<HTMLDivElement>(null),
    labels = useRef(new Map<string, HTMLButtonElement>()),
    sliceLabels = useRef(new Map<string, HTMLButtonElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const [infoOpen, setInfoOpen] = useState(!!district);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [layer, setLayer] = useState<LandLayer>("opportunity"),
    [ready, setReady] = useState(false),
    [relief, setRelief] = useState(false),
    [reliefFailed, setReliefFailed] = useState(false),
    [water, setWater] = useState(false),
    [failed, setFailed] = useState(false),
    [auto, setAuto] = useState(false),
    [hover, setHover] = useState("");
  const core = useRef<ReturnType<typeof createSceneCore>>(null);
  const frameScene = useRef<() => void>(() => {});
  const sheetFrame = useRef<(box: DOMRect | null) => void>(() => {});
  /** Drops any camera flight in progress, so a preset or zoom is not undone. */
  const cancelFlight = useRef<() => void>(() => {});
  const latest = useRef({ selected, district, depth, peel, layer });
  latest.current = { selected, district, depth, peel, layer };
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
    world.provinces = provinces;
    world.districts = districts;
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

    const grid = new THREE.GridHelper(
      220,
      22,
      SCENE.gridPrimary,
      SCENE.gridSecondary,
    );
    grid.position.y = -1.2;
    scene.add(grid);

    let flight: {
      from: THREE.Vector3;
      to: THREE.Vector3;
      targetFrom: THREE.Vector3;
      targetTo: THREE.Vector3;
      time: number;
    } | null = null;

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
      const distance = modelDistance(span, aspect, camera.fov);
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
        return;
      }
      // A side sheet on a wide stage, a bottom sheet on a narrow one.
      const inset =
        box.width < width * 0.6
          ? { right: Math.round(width - box.left) }
          : { bottom: Math.round(height - box.top) };
      const region = visibleViewRegion(width, height, inset);
      if (region)
        camera.setViewOffset(
          width,
          height,
          region.x,
          region.y,
          region.width,
          region.height,
        );
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      engine.wake();
    };
    sheetFrame.current = setSheet;

    const ray = new THREE.Raycaster(),
      mouse = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | null = null;
    let hovering: THREE.Mesh | null = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const project = (
      node: HTMLButtonElement | undefined,
      point: THREE.Vector3,
      visible: boolean,
    ) => {
      if (!node) return;
      const screen = projectToScreen(point, camera, el.clientWidth, el.clientHeight);
      visible = visible && !screen.behind;
      node.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;
      node.style.opacity = visible ? "1" : "0";
      node.style.pointerEvents = visible ? "auto" : "none";
      node.tabIndex = visible ? 0 : -1;
    };

    const animate = (speed: number) => {
      const now = performance.now();
      const state = latest.current;
      const store = useExplorer.getState();
      const solo = store.isolate ? isolatedDistrict(store.selection) : null;
      const transforms = pieceTransforms(depthInput());
      world.waterGroup.visible = !state.selected;
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
        const material = p.meshes[0].material as THREE.MeshStandardMaterial;
        material.opacity = 1;
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
          project(labels.current.get(p.id), p.centre, false);
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
        p.group.position.lerp(target, speed);
        p.meshes.forEach((m, i) => {
          m.visible = !chosen || !store.hidden.has(LAND_LAYERS[i].id);
          // The chosen district's Peel slider trims its own separation; the
          // depth stages come from the tested pure function.
          const want = sliceHeight(
            i,
            chosen ? state.peel : (transform?.layerGap ?? 0),
          );
          m.position.y += (want - m.position.y) * speed;
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
        const t = reduced ? 1 : Math.min(1, (now - flight.time) / FLIGHT_MS),
          e = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(flight.from, flight.to, e);
        controls.target.lerpVectors(flight.targetFrom, flight.targetTo, e);
        if (t === 1) flight = null;
      }
      if (!flight) {
        // Which preset the current angle matches — null once the user orbits
        // away from all three. Kept in the store so the chrome can show it.
        const matched = presetFor(camera.position.clone().sub(controls.target), 4);
        if (useExplorer.getState().cameraPreset !== matched)
          useExplorer.setState({ cameraPreset: matched });
      }
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
      store.selectDistrict(d.province, d.id);
      setLayer(d.layer);
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
  const chooseDistrict = (id: string) => {
    setHidden(new Set());
    setInfoOpen(true);
    setControlsOpen(false);
    selectDistrict(selected!, id);
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
    <div className="anatomy-stage" data-camera={cameraPreset ?? "free"}>
      <p className="anatomy-source" role="status">
        {relief
          ? `Regional relief (~2.3 km grid), vertical scale ×${RELIEF_EXAGGERATION}${
              water && !selected ? " · major rivers shown" : ""
            } · ${DEM_ATTRIBUTION}`
          : reliefFailed
            ? "Regional relief unavailable · overview still usable"
            : "Adding regional relief…"}
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
                onClick={() => toggleHidden(l.id)}
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
            if (depth === 0) {
              setDepth(0.72);
              setPeel(0.82);
            } else {
              setDepth(0);
              setPeel(0);
              setHidden(new Set());
              setIsolate(false);
              selectDistrict(selected!, null);
            }
          }}
        >
          {depth === 0 ? "Separate regions" : "Reassemble"}
        </button>
      </div>
      <p className="anatomy-footnote">
        Geographic shapes · thematic slices, not measured soil strata · drag to
        orbit · pinch to zoom
      </p>
    </div>
  );
}
