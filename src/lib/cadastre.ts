import parcels from "@/data/notice-parcels.json";
export const CADASTRE_SOURCE =
  "https://dffeportal.environment.gov.za/hosting/rest/services/CSG_Cadaster/CSG_Cadastral_Data/MapServer/1";
export const NOTICE_PARCELS = parcels as unknown as GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  {
    noticeId: string;
    cadastralId: string;
    name: string;
    gisHectares: number;
    coordinates: [number, number];
    checkedAt: string;
    sourceDate: number;
  }
>;
export const parcelFor = (id: string) =>
  NOTICE_PARCELS.features.find((f) => f.properties.noticeId === id);
export function parcelBounds(
  id: string,
): [[number, number], [number, number]] | null {
  const parcel = parcelFor(id);
  if (!parcel) return null;
  const points = parcel.geometry.coordinates.flat();
  return [
    [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
    ],
    [
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    ],
  ];
}
