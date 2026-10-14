/**
 * Design: the still assets the film is cut from.
 *
 *   Satori   JSX → SVG title card and poster, with the app's own numbers
 *   SVGO     every SVG is cleaned before it is animated or rasterised
 *   resvg    SVG → PNG for the poster and the review contact sheet
 *   Lottie   the notice pin, authored as a Lottie document for dotLottie
 *
 * Writes to studio/public/design/. Run with `npm run design`.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { optimize } from "svgo";
import { Resvg } from "@resvg/resvg-js";
import { COUNTS, MAP, PROVINCE_PATHS, SOURCES } from "../src/film/data";
import { PALETTE } from "../src/film/theme";

const OUT = join(import.meta.dirname, "..", "public", "design");
mkdirSync(OUT, { recursive: true });

const font = (file: string) =>
  readFileSync(join(import.meta.dirname, "..", "node_modules", "@fontsource", file));
const FONTS = [
  { name: "Manrope", data: font("manrope/files/manrope-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
  { name: "Manrope", data: font("manrope/files/manrope-latin-600-normal.woff"), weight: 600 as const, style: "normal" as const },
  { name: "Inter", data: font("inter/files/inter-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
];

function clean(svg: string, name: string): string {
  const before = Buffer.byteLength(svg);
  const result = optimize(svg, {
    multipass: true,
    plugins: ["preset-default"],
  }).data;
  console.log(`svgo  ${name}: ${before} → ${Buffer.byteLength(result)} bytes`);
  return result;
}

function png(svg: string, width: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

/** The title card: what the film is, and the three counts it is built on. */
function TitleCard({ width, height }: { width: number; height: number }) {
  const scale = width / 1920;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        background: `linear-gradient(160deg, ${PALETTE.stageTop}, ${PALETTE.stageBottom})`,
        color: PALETTE.ink,
        fontFamily: "Inter",
      }}
    >
      {/* Satori adds padding to the declared height, so the margin is an
          inset box instead. */}
      <div
        style={{
          position: "absolute",
          top: 110 * scale,
          left: 120 * scale,
          right: 120 * scale,
          bottom: 100 * scale,
          display: "flex",
          flexDirection: "column",
        }}
      >
      <div style={{ display: "flex", alignItems: "center", gap: 24 * scale }}>
        <div
          style={{
            width: 72 * scale,
            height: 72 * scale,
            borderRadius: 16 * scale,
            background: PALETTE.ink,
            color: PALETTE.stageBottom,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Manrope",
            fontWeight: 700,
            fontSize: 44 * scale,
          }}
        >
          A
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 40 * scale }}>asbonge</div>
          <div style={{ fontSize: 18 * scale, letterSpacing: 4 * scale, color: PALETTE.muted }}>
            LAND &amp; OPPORTUNITY
          </div>
        </div>
      </div>
      {/* Pushes the headline and the counts to the lower half. */}
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 * scale }}>
        <div style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 150 * scale, letterSpacing: -6 * scale, lineHeight: 1 }}>
          Open the land.
        </div>
        <div style={{ fontSize: 40 * scale, color: PALETTE.muted, maxWidth: 1300 * scale }}>
          Where South Africa’s state farmland is, what it is like, and how to apply for it.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 * scale, marginTop: 72 * scale }}>
        <div style={{ display: "flex", gap: 56 * scale, fontFamily: "Manrope", fontWeight: 600, fontSize: 40 * scale, color: PALETTE.accent }}>
          <div>{`${COUNTS.provinces} provinces`}</div>
          <div>{`${COUNTS.districts} districts`}</div>
          <div>{`${COUNTS.notices} lease notices reviewed`}</div>
        </div>
        <div style={{ fontSize: 20 * scale, color: PALETTE.muted }}>{SOURCES.notices}</div>
      </div>
      </div>
    </div>
  );
}

/** The country outline in the app's projection, cleaned for drawing on. */
function outlineSvg(): string {
  const paths = PROVINCE_PATHS.map(
    (p) => `<path data-code="${p.code}" d="${p.d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.width} ${MAP.height}">${paths}</svg>`;
}

/**
 * The notice pin as a Lottie document: drops in with a small overshoot and
 * sends one ring out across the ground. 30 fps, 36 frames, 96 × 96.
 */
function pinLottie() {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const ease = { i: { x: [0.25], y: [1] }, o: { x: [0.6], y: [0] } };
  const fill = (hex: string) => ({ ty: "fl", c: { a: 0, k: [...rgb(hex), 1] }, o: { a: 0, k: 100 }, r: 1 });
  const stroke = (hex: string, w: number) => ({ ty: "st", c: { a: 0, k: [...rgb(hex), 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: w }, lc: 2, lj: 2 });
  const transform = { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } };
  const ground = 76;
  return {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 36,
    w: 96,
    h: 96,
    nm: "notice-pin",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0, ind: 1, ty: 4, nm: "pin", sr: 1, ao: 0, ip: 0, op: 36, st: 0, bm: 0,
        ks: {
          o: { a: 1, k: [{ t: 0, s: [0], ...ease }, { t: 6, s: [100] }] },
          r: { a: 0, k: 0 },
          p: { a: 1, k: [
            { t: 0, s: [48, 10, 0], ...ease },
            { t: 12, s: [48, ground + 3, 0], ...ease },
            { t: 17, s: [48, ground - 4, 0], ...ease },
            { t: 22, s: [48, ground, 0] },
          ] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 1, k: [
            { t: 0, s: [70, 70, 100], ...ease },
            { t: 12, s: [112, 88, 100], ...ease },
            { t: 18, s: [96, 104, 100], ...ease },
            { t: 24, s: [100, 100, 100] },
          ] },
        },
        shapes: [
          {
            ty: "gr", nm: "head",
            it: [
              {
                ty: "sh",
                ks: { a: 0, k: {
                  c: true,
                  v: [[0, 0], [-11, -19], [0, -31], [11, -19]],
                  i: [[3, -5], [0, 7], [-6.5, 0], [0, -7]],
                  o: [[-3, -5], [0, -7], [6.5, 0], [0, 7]],
                } },
              },
              fill(PALETTE.accent),
              stroke(PALETTE.stageBottom, 2),
              transform,
            ],
          },
          {
            ty: "gr", nm: "eye",
            it: [
              { ty: "el", p: { a: 0, k: [0, -19] }, s: { a: 0, k: [8, 8] } },
              fill(PALETTE.stageBottom),
              transform,
            ],
          },
        ],
      },
      {
        ddd: 0, ind: 2, ty: 4, nm: "ring", sr: 1, ao: 0, ip: 12, op: 36, st: 0, bm: 0,
        ks: {
          o: { a: 1, k: [{ t: 12, s: [90], ...ease }, { t: 34, s: [0] }] },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [48, ground + 1, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 1, k: [{ t: 12, s: [20, 20, 100], ...ease }, { t: 34, s: [100, 100, 100] }] },
        },
        shapes: [
          {
            ty: "gr", nm: "ring",
            it: [
              { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 26] } },
              stroke(PALETTE.accent, 2.5),
              transform,
            ],
          },
        ],
      },
    ],
  };
}

async function main() {
  for (const [name, width, height] of [
    ["title-card", 1920, 1080],
    ["poster", 1280, 720],
  ] as const) {
    const svg = clean(await satori(<TitleCard width={width} height={height} />, { width, height, fonts: FONTS }), `${name}.svg`);
    writeFileSync(join(OUT, `${name}.svg`), svg);
    writeFileSync(join(OUT, `${name}.png`), png(svg, width));
  }
  writeFileSync(join(OUT, "outline.svg"), clean(outlineSvg(), "outline.svg"));
  writeFileSync(join(OUT, "pin.json"), JSON.stringify(pinLottie()));
  console.log(`design: wrote title-card, poster, outline and pin to ${OUT}`);

  // Runtime assets the film loads, staged next to it so a render never
  // reaches out to a CDN: the app's typefaces (OFL, licence alongside) and
  // the dotLottie renderer's WebAssembly.
  const modules = join(import.meta.dirname, "..", "node_modules");
  const fonts = join(import.meta.dirname, "..", "public", "fonts");
  mkdirSync(fonts, { recursive: true });
  for (const [from, to] of [
    ["@fontsource/manrope/files/manrope-latin-700-normal.woff", "manrope-700.woff"],
    ["@fontsource/manrope/files/manrope-latin-600-normal.woff", "manrope-600.woff"],
    ["@fontsource/inter/files/inter-latin-400-normal.woff", "inter-400.woff"],
    ["@fontsource/manrope/LICENSE", "OFL-manrope.txt"],
    ["@fontsource/inter/LICENSE", "OFL-inter.txt"],
  ])
    copyFileSync(join(modules, from), join(fonts, to));
  copyFileSync(
    join(modules, "@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm"),
    join(OUT, "dotlottie-player.wasm"),
  );
  console.log("design: staged fonts and the dotLottie runtime");
}

await main();
