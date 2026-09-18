/**
 * Pieces of the exploded model: province plates, district four-slice stacks,
 * the rivers draped on the land surface and the dressing that ties pieces to
 * their geographic home. Everything three.js about *what is drawn* lives
 * here; `core.ts` owns the renderer and `ModelView` owns behaviour.
 */
import * as THREE from "three";
import { projectedRings } from "@/lib/geo";
import { LAND_LAYERS, sliceHeight } from "@/lib/exploded-map";
import { applyRelief, surfacePoint, type Dem } from "@/lib/dem";
import { SCENE } from "@/design/ramps";
import type { ProvinceCode } from "@/lib/types";
import RIVERS from "@/data/sa-rivers.json";

export interface Piece {
  id: string;
  province: ProvinceCode;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  centre: THREE.Vector3;
  size: THREE.Vector3;
  anchor: THREE.Vector3;
  /** World centre before re-centring — needed to map vertices back to lon/lat. */
  origin: THREE.Vector3;
}

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

/**
 * Lifts every piece onto the real land surface and rebuilds the outlines that
 * snapshot the old geometry. The slabs draw flat until the grid resolves; a
 * failed fetch simply leaves them as they were.
 */
export function applyReliefToPieces(pieces: Piece[], dem: Dem): void {
  for (const piece of pieces) {
    const geometry = piece.meshes[0].geometry;
    applyRelief(geometry, dem, EXTRUDE_DEPTH, piece.origin);
    for (const mesh of piece.meshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.vertexColors = true;
      material.needsUpdate = true;
    }
    for (const mesh of piece.meshes) {
      for (const child of mesh.children) {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          child.geometry = new THREE.EdgesGeometry(geometry, 25);
        }
      }
    }
  }
}

/**
 * The major rivers, draped on the land surface. Six lines from Natural Earth
 * — the Orange, Vaal, Limpopo and Okavango — which is what the irrigation
 * schemes in the dossiers actually draw from.
 */
export function buildRivers(dem: Dem, countryCentre: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  for (const feature of RIVERS.features) {
    const coordinates = feature.geometry.coordinates as unknown;
    const parts: [number, number][][] =
      feature.geometry.type === "MultiLineString"
        ? (coordinates as [number, number][][])
        : [coordinates as [number, number][]];
    for (const line of parts) {
      const points = line.map(([lon, lat]) =>
        surfacePoint(
          dem,
          lon,
          lat,
          EXTRUDE_DEPTH + 0.16 + countryCentre.y,
        ).sub(countryCentre),
      );
      if (points.length < 2) continue;
      group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: SCENE.water,
            transparent: true,
            opacity: 0.85,
          }),
        ),
      );
    }
  }
  return group;
}

/** The faint outline that marks where the selected province sits in the country. */
export function buildFootprints(
  provinces: Piece[],
): { id: string; outline: THREE.LineSegments }[] {
  return provinces.map((piece) => {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(piece.meshes[0].geometry, 25),
      new THREE.LineBasicMaterial({
        color: SCENE.footprint,
        transparent: true,
        opacity: 0.4,
      }),
    );
    outline.position.copy(piece.centre);
    outline.position.y = -0.2;
    return { id: piece.id, outline };
  });
}

/** Dashed lines from each district's resting place to where it has flown. */
export function buildTethers(
  districts: Piece[],
): { piece: Piece; line: THREE.Line }[] {
  return districts.map((piece) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      piece.centre,
      piece.centre,
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineDashedMaterial({
        color: SCENE.tether,
        transparent: true,
        opacity: 0.32,
        dashSize: 0.5,
        gapSize: 0.5,
      }),
    );
    return { piece, line };
  });
}

/** Disposes every geometry and material under a root, once each. */
export function disposeSubtree(root: THREE.Object3D): void {
  const geometry = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometry.add(mesh.geometry);
    if (mesh.material)
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
        (material) => materials.add(material),
      );
  });
  geometry.forEach((entry) => entry.dispose());
  materials.forEach((entry) => entry.dispose());
}
