/**
 * Data colours for maps and 3D scenes. These describe data and set design —
 * never UI state, which reads the tokens in src/styles/tokens.css through
 * readToken(). Hex lives here and here only; components import names.
 */

/** Statistical-height ramp for the compare view, light surface. */
export const LAND_RAMP_LIGHT = [
  "#e9eee1",
  "#d3dec5",
  "#bacaa6",
  "#a0b687",
  "#88a972",
  "#688f53",
  "#4f7540",
  "#2a4524",
] as const;

/** Statistical-height ramp for the compare view, dark surface. */
export const LAND_RAMP_DARK = [
  "#232d1e",
  "#2e3f26",
  "#3b532f",
  "#4a6b39",
  "#5c8546",
  "#74a159",
  "#90bc77",
  "#b4d49e",
] as const;

/**
 * Atlas symbology. Fills and outlines are chosen to read on satellite
 * imagery in both themes, so they stay fixed rather than following tokens.
 */
export const ATLAS = {
  provinceFill: "#5bdbad",
  provinceBorders: "#f4f8df",
  provinceFocus: "#b8f6d9",
  districtFill: "#d6f7ac",
  districtBorders: "#e1ffde",
  districtFocus: "#f9ec9f",
  rivers: "#73cce1",
  noticeParcelFill: "#d5ef86",
  noticeParcelLine: "#e9ff8c",
  background: "#162c32",
  sky: "#b4d8ed",
  horizon: "#e7ede2",
  fog: "#d4e5df",
} as const;

/** Live infrastructure symbology, matching the source styles. */
export const INFRA = {
  dams: "#35bedb",
  damsOutline: "#b0f3ff",
  riverPerennial: "#65e2fc",
  riverOther: "#b3cddb",
  power: "#ffd36b",
} as const;

/**
 * ESA WorldCover v200 class colours, keyed by class code. These are the
 * published WorldCover legend colours, and the same values bake the
 * land-cover raster (scripts/data/raster-colors.json), so a share on a card
 * and a pixel on the map read as the same class. tests/ramps.test.ts pins
 * the two together.
 */
export const WORLDCOVER: Record<string, string> = {
  "10": "#006400",
  "20": "#ffbb22",
  "30": "#ffff4c",
  "40": "#f096ff",
  "50": "#fa0000",
  "60": "#b4b4b4",
  "70": "#f0f0f0",
  "80": "#0064c8",
  "90": "#0096a0",
  "95": "#00cf75",
  "100": "#fae6a0",
};

/** The bar segment for classes too small to draw on their own. */
export const OTHER_CLASS = "#9aa39c";

/**
 * The value ramps the rasters are painted with, as [value, colour] stops:
 * rain in mm/year, soil pH, soil clay in g/kg. The district card draws its
 * scales from these, so a scale on a card and the same layer on the map use
 * one set of colours. tests/district-data.test.ts pins them to the rasters.
 */
export type Ramp = [number, string][];
export const RASTER_RAMPS: { rain: Ramp; soilPh: Ramp; soilClay: Ramp } = {
  rain: [[0, "#f7fbff"], [100, "#e6eff8"], [200, "#cfe0f1"], [400, "#a8c8e0"], [600, "#7dabcc"], [800, "#5491bd"], [1000, "#3a76af"], [1200, "#2c5f98"], [1400, "#214d80"], [1600, "#163d66"], [1800, "#0d2e4e"], [2000, "#08203a"]],
  soilPh: [[3.5, "#d73027"], [4.5, "#f46d43"], [5.5, "#fdae61"], [6.5, "#fee08b"], [7.0, "#ffffbf"], [7.5, "#d9ef8b"], [8.0, "#a6d96a"], [8.5, "#66bd63"], [9.0, "#1a9850"], [10, "#006837"]],
  soilClay: [[0, "#fddbc7"], [50, "#f4a582"], [100, "#d6604d"], [200, "#b2182b"], [300, "#67001f"], [400, "#3f0008"]],
};

/** The four exploded-model slices, keyed by layer id. Flat colours with honest captions. */
export const LAYERS = {
  land: "#80bfa3",
  soil: "#cfaa7c",
  climate: "#66c6dc",
  opportunity: "#cfe78b",
} as const;

/**
 * Fixed 3D set design: lights, sky, grid and water lines. Theme-independent
 * staging, kept out of the token system on purpose.
 */
export const SCENE = {
  white: "#ffffff",
  hemiSky: "#d8fff1",
  hemiGround: "#35424d",
  sun: "#fff4db",
  rim: "#73dbe0",
  water: "#5fb8d6",
  footprint: "#a1cdb9",
  tether: "#96b9a7",
  gridPrimary: "#24404a",
  gridSecondary: "#182f37",
  modelBase: "#729f92",
} as const;
