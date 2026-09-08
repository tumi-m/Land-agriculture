import { geoMercator, geoPath, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type {
  GeometryCollection,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from 'topojson-specification';
import topo from '@/data/sa-districts.topo.json';
import { PROVINCE_ORDER, PROVINCES } from './provinces';
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

export function project(coordinates: [number, number]): [number, number] {
  return (projection(coordinates) ?? [0, 0]) as [number, number];
}
