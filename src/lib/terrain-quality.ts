export type TerrainQuality = "balanced" | "detail" | "economy";
export function terrainBudget(
  quality: TerrainQuality,
  width: number,
  deviceRatio: number,
) {
  const mobile = width < 768;
  return {
    pixelRatio: Math.min(
      Math.max(1, deviceRatio),
      quality === "economy" ? 1 : quality === "detail" ? 2 : mobile ? 1.5 : 2,
    ),
    tileCache: quality === "economy" ? 32 : mobile ? 64 : 128,
    maxPitch: mobile ? 60 : 70,
    terrain: quality !== "economy",
  };
}
