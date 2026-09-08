import { geoMercator, geoPath, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type {
  GeometryCollection,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from 'topojson-specification';
import topo from '@/data/sa-districts.topo.json';
import { PROVINCES, PROVINCE_ORDER } from '@/content/provinces';
import type { ProvinceCode } from './types';

interface DistrictProps {
  id: string;
  name: string;
  province: ProvinceCode;
}

type SaTopology = Topology<{ districts: GeometryCollection<DistrictProps> }>;

const topology = topo as unknown as SaTopology;

type DistrictGeometry = TopoPolygon<DistrictProps> | TopoMultiPolygon<DistrictProps>;

const districtGeometries = topology.objects.districts.geometries as DistrictGeometry[];

export interface DistrictShape {
  id: string;
  name: string;
  province: ProvinceCode;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
}

export interface ProvinceShape {
  code: ProvinceCode;
  name: string;
  geometry: GeoJSON.MultiPolygon;
}

export const DISTRICTS: DistrictShape[] = feature(
  topology,
  topology.objects.districts,
).features.map((f) => ({
  id: f.properties.id,
  name: f.properties.name,
  province: f.properties.province,
  geometry: f.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon,
}));

export const PROVINCE_SHAPES: ProvinceShape[] = PROVINCE_ORDER.map((code) => ({
  code,
  name: PROVINCES[code].name,
  geometry: merge(
    topology,
    districtGeometries.filter((g) => g.properties?.province === code),
  ),
}));

export const DISTRICTS_BY_PROVINCE: Record<ProvinceCode, DistrictShape[]> = PROVINCE_ORDER.reduce(
  (acc, code) => {
    acc[code] = DISTRICTS.filter((d) => d.province === code).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return acc;
  },
  {} as Record<ProvinceCode, DistrictShape[]>,
);

const COUNTRY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: PROVINCE_SHAPES.map((p) => ({
    type: 'Feature',
    properties: {},
    geometry: p.geometry,
  })),
};

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 880;

export const projection = geoMercator().fitExtent(
  [
    [24, 24],
    [MAP_WIDTH - 24, MAP_HEIGHT - 24],
  ],
  COUNTRY,
);

export const path: GeoPath = geoPath(projection);

const pathCache = new Map<string, string>();

export function cachedPath(key: string, geometry: GeoPermissibleObjects): string {
  const hit = pathCache.get(key);
  if (hit !== undefined) return hit;
  const d = path(geometry) ?? '';
  pathCache.set(key, d);
  return d;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export function boundsOf(geometry: GeoPermissibleObjects): Box {
  const [[x0, y0], [x1, y1]] = path.bounds(geometry);
  return {
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
  };
}

export const PROVINCE_BOXES: Record<ProvinceCode, Box> = PROVINCE_ORDER.reduce((acc, code) => {
  const shape = PROVINCE_SHAPES.find((p) => p.code === code)!;
  acc[code] = boundsOf(shape.geometry);
  return acc;
}, {} as Record<ProvinceCode, Box>);

/** Label anchors nudged off the polygon centroid where it sits badly (coastal arcs, metros). */
const LABEL_NUDGE: Partial<Record<ProvinceCode, [number, number]>> = {
  GP: [30, -26],
  KZN: [-18, 10],
  WC: [10, -18],
  EC: [-6, -10],
};

export const PROVINCE_LABELS = PROVINCE_ORDER.map((code) => {
  const box = PROVINCE_BOXES[code];
  const [dx, dy] = LABEL_NUDGE[code] ?? [0, 0];
  return { code, x: box.cx + dx, y: box.cy + dy };
});

export const DISTRICT_BOXES: Record<string, Box> = DISTRICTS.reduce(
  (acc, district) => {
    acc[district.id] = boundsOf(district.geometry);
    return acc;
  },
  {} as Record<string, Box>,
);

export interface PolygonRings {
  outer: [number, number][];
  holes: [number, number][][];
}

/**
 * Province outlines as projected rings, centred on the map and flipped for a
 * Y-up scene. Feeding these to THREE.Shape gives extrudable province solids
 * that sit in the same projection as the flat map.
 */
export function projectedRings(geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon): PolygonRings[] {
  const polygons: GeoJSON.Position[][][] =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

  const toWorld = (ring: GeoJSON.Position[]): [number, number][] =>
    ring
      .map((p) => projection([p[0], p[1]]))
      .filter((p): p is [number, number] => p !== null)
      // Centre on the map, flip Y (screen space is Y-down, the scene is Y-up),
      // and scale so the country is ~100 units across.
      .map(([x, y]) => [(x - MAP_WIDTH / 2) / 10, -(y - MAP_HEIGHT / 2) / 10]);

  // Shoelace area, used to drop slivers and offshore rocks that triangulate to
  // nothing and poison the geometry with NaN.
  const area = (ring: [number, number][]) => {
    let sum = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    }
    return Math.abs(sum / 2);
  };

  const dedupe = (ring: [number, number][]) =>
    ring.filter(
      (p, i) => i === 0 || Math.abs(p[0] - ring[i - 1][0]) > 1e-6 || Math.abs(p[1] - ring[i - 1][1]) > 1e-6,
    );

  const MIN_AREA = 0.02; // world units² — below this a ring is invisible at any usable zoom

  // Douglas-Peucker. The flat map wants every wiggle; an extruded solid does not
  // — thousands of near-collinear points turn each side wall into a moiré fan.
  //
  // A closed ring cannot be fed to the plain algorithm: its two endpoints are the
  // same point, the baseline has zero length, every perpendicular distance comes
  // out zero and the whole ring collapses. So the ring is cut at the vertex
  // farthest from its start and each half simplified as an open line.
  const simplifyOpen = (line: [number, number][], epsilon: number): [number, number][] => {
    if (line.length < 3) return line;

    const keep = new Uint8Array(line.length);
    keep[0] = 1;
    keep[line.length - 1] = 1;
    const stack: [number, number][] = [[0, line.length - 1]];

    while (stack.length > 0) {
      const [first, last] = stack.pop()!;
      if (last <= first + 1) continue;

      const [ax, ay] = line[first];
      const [bx, by] = line[last];
      const dx = bx - ax;
      const dy = by - ay;
      const norm = Math.hypot(dx, dy);

      let farthest = -1;
      let best = epsilon;
      for (let i = first + 1; i < last; i++) {
        const [px, py] = line[i];
        const distance =
          norm < 1e-9
            ? Math.hypot(px - ax, py - ay)
            : Math.abs(dy * px - dx * py + bx * ay - by * ax) / norm;
        if (distance > best) {
          best = distance;
          farthest = i;
        }
      }

      if (farthest !== -1) {
        keep[farthest] = 1;
        stack.push([first, farthest], [farthest, last]);
      }
    }

    return line.filter((_, i) => keep[i] === 1);
  };

  const simplifyRing = (ring: [number, number][], epsilon: number): [number, number][] => {
    if (ring.length < 6) return ring;

    const closed =
      Math.abs(ring[0][0] - ring[ring.length - 1][0]) < 1e-9 &&
      Math.abs(ring[0][1] - ring[ring.length - 1][1]) < 1e-9;
    const points = closed ? ring.slice(0, -1) : ring;

    let pivot = 0;
    let farthest = -1;
    for (let i = 1; i < points.length; i++) {
      const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
      if (d > farthest) {
        farthest = d;
        pivot = i;
      }
    }
    if (pivot < 2) return ring;

    const head = simplifyOpen(points.slice(0, pivot + 1), epsilon);
    const tail = simplifyOpen(points.slice(pivot), epsilon);
    const merged = head.concat(tail.slice(1));

    if (merged.length < 4) return ring;
    return closed ? merged.concat([merged[0]]) : merged;
  };

  const EPSILON = 0.15; // world units — roughly 2 km on the ground

  return polygons
    .map((rings) => ({
      outer: simplifyRing(dedupe(toWorld(rings[0])), EPSILON),
      holes: rings
        .slice(1)
        .map((r) => simplifyRing(dedupe(toWorld(r)), EPSILON))
        .filter((r) => r.length > 3 && area(r) > MIN_AREA),
    }))
    .filter((p) => p.outer.length > 3 && area(p.outer) > MIN_AREA);
}

export function project(coordinates: [number, number]): [number, number] {
  return (projection(coordinates) ?? [0, 0]) as [number, number];
}
