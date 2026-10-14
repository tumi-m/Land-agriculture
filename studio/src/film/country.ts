/**
 * The nine provinces as solid slabs, from the same projected rings the app
 * builds its model from (src/lib/geo.ts), so the film shows the real shapes.
 */
import * as THREE from "three";
import { MAP_HEIGHT, MAP_WIDTH, PROVINCE_LABELS, PROVINCE_SHAPES, projectedRings } from "@/lib/geo";

export const SLAB_DEPTH = 1.6;

export interface ProvinceSlab {
  code: string;
  name: string;
  geometry: THREE.ExtrudeGeometry;
  /** Where the slab rests, in scene units, centred on the country. */
  x: number;
  z: number;
  /** Footprint size. */
  size: THREE.Vector3;
  /** Where the app puts the province's name, in the same scene units. */
  label: { x: number; z: number };
}

function slab(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): THREE.ExtrudeGeometry {
  const shapes = projectedRings(geometry).map(({ outer, holes }) => {
    const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
    return shape;
  });
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: SLAB_DEPTH,
    bevelEnabled: true,
    bevelSize: 0.12,
    bevelThickness: 0.1,
    bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Built once; each slab's geometry is centred on its own footprint. */
export const SLABS: ProvinceSlab[] = (() => {
  const raw = PROVINCE_SHAPES.map((p) => ({ p, g: slab(p.geometry) }));
  const all = new THREE.Box3();
  for (const { g } of raw) {
    g.computeBoundingBox();
    all.union(g.boundingBox!);
  }
  const middle = all.getCenter(new THREE.Vector3());
  return raw.map(({ p, g }) => {
    const box = g.boundingBox!;
    const centre = box.getCenter(new THREE.Vector3());
    g.translate(-centre.x, -box.min.y, -centre.z);
    // The app's label anchors are map pixels; projectedRings maps those to
    // scene units by centring, dividing by ten and flipping y, and the slab
    // was then turned so that north runs along -z.
    const anchor = PROVINCE_LABELS.find((l) => l.code === p.code)!;
    return {
      code: p.code,
      name: p.name,
      geometry: g,
      x: centre.x - middle.x,
      z: centre.z - middle.z,
      size: box.getSize(new THREE.Vector3()),
      label: {
        x: (anchor.x - MAP_WIDTH / 2) / 10 - middle.x,
        z: (anchor.y - MAP_HEIGHT / 2) / 10 - middle.z,
      },
    };
  });
})();
