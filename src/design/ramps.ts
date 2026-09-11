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
