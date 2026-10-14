/**
 * Notices: the country is drawn on in outline, then a pin drops on every
 * district with a reviewed lease notice, west to east, while the count of
 * placed notices climbs.
 *
 *   SVGO + GSAP DrawSVG   the outline is the cleaned asset from the design
 *                         stage, drawn on province by province
 *   dotLottie             each pin is the Lottie authored in the design stage,
 *                         set to an exact frame rather than played
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useDelayRender } from "remotion";
import { DotLottie } from "@lottiefiles/dotlottie-web";
import { Backdrop, SAFE, kicker, source } from "./Brand";
import { COUNTS, MAP, NOTICE_PINS, SOURCES } from "./data";
import { PIN_FRAMES, SCENES, pinFrame } from "./timeline";
import { PALETTE } from "./theme";
import { FONTS } from "../lib/fonts";
import { useTimeline } from "../lib/gsap";

// The renderer's WebAssembly is staged next to the film, never fetched from a CDN.
DotLottie.setWasmUrl(staticFile("design/dotlottie-player.wasm"));

/** The map's box on screen: right of the text column, full height. */
const MAP_BOX = { top: 90, height: 910 };
const SCALE = MAP_BOX.height / MAP.height;
const MAP_LEFT = 1840 - MAP.width * SCALE;

/** The pin's art is 96 px with its tip at (48, 76); it is drawn at 104 px. */
const PIN_SIZE = 104;
const PIN_TIP = { x: 48 * (PIN_SIZE / 96), y: 76 * (PIN_SIZE / 96) };
/** The Lottie frame on which the pin touches the ground. */
const PIN_LANDS = 12;

const start = (i: number) => pinFrame(i) - SCENES.notices.from;
const PLACED = NOTICE_PINS.reduce((sum, p) => sum + p.count, 0);
const UNPLACED = COUNTS.notices - PLACED;
const DONE = start(NOTICE_PINS.length - 1) + PIN_FRAMES;

/** Loads a staged text file once, holding the render until it arrives. */
function useStaged(file: string): string | null {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const hold = delayRender(`Loading ${file}`);
    fetch(staticFile(file))
      .then((r) => r.text())
      .then((t) => {
        setText(t);
        continueRender(hold);
      })
      .catch((e) => cancelRender(e));
  }, [file, delayRender, continueRender, cancelRender]);
  return text;
}

function Outline({ svg }: { svg: string }) {
  const scope = useRef<SVGSVGElement>(null);
  // The cleaned file's paths, without its own <svg> wrapper. One object for
  // the life of the component: React re-applies innerHTML whenever this
  // prop is a new object, which would swap in fresh paths every frame and
  // leave GSAP animating the old, detached ones.
  const markup = useMemo(
    () => ({ __html: svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "") }),
    [svg],
  );

  useTimeline(
    scope,
    (tl) => {
      const paths = [...scope.current!.querySelectorAll("path")].sort(
        (a, b) => a.getBBox().x - b.getBBox().x,
      );
      tl.set(paths, { attr: { fill: PALETTE.land, "fill-opacity": 0 } }, 0)
        .from(paths, { drawSVG: "0%", duration: 1.1, ease: "power2.inOut", stagger: 0.08 }, 0)
        .to(paths, { attr: { "fill-opacity": 0.14 }, duration: 0.8, ease: "power1.out" }, 1.4);
    },
    svg,
  );

  return (
    <svg
      ref={scope}
      viewBox={`0 0 ${MAP.width} ${MAP.height}`}
      style={{
        position: "absolute",
        left: MAP_LEFT,
        top: MAP_BOX.top,
        width: MAP.width * SCALE,
        height: MAP_BOX.height,
        color: PALETTE.land,
        overflow: "visible",
      }}
      dangerouslySetInnerHTML={markup}
    />
  );
}

function Pin({ data, x, y, frame }: { data: string; x: number; y: number; frame: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<DotLottie | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    let hold: number | null = delayRender("Loading a notice pin");
    const release = () => {
      if (hold !== null) continueRender(hold);
      hold = null;
    };
    const p = new DotLottie({
      canvas: canvas.current!,
      data,
      autoplay: false,
      loop: false,
      renderConfig: { autoResize: false, devicePixelRatio: 1, freezeOnOffscreen: false },
    });
    p.addEventListener("load", () => {
      setLoaded(true);
      release();
    });
    player.current = p;
    return () => {
      p.destroy();
      release();
    };
  }, [data, delayRender, continueRender]);

  useLayoutEffect(() => {
    if (loaded) player.current?.setFrame(Math.max(0, Math.min(PIN_FRAMES - 1, frame)));
  }, [loaded, frame]);

  return (
    <canvas
      ref={canvas}
      width={PIN_SIZE * 2}
      height={PIN_SIZE * 2}
      style={{
        position: "absolute",
        left: MAP_LEFT + x * SCALE - PIN_TIP.x,
        top: MAP_BOX.top + y * SCALE - PIN_TIP.y,
        width: PIN_SIZE,
        height: PIN_SIZE,
        opacity: frame < 0 ? 0 : 1,
      }}
    />
  );
}

export function NoticesScene() {
  const frame = useCurrentFrame();
  const svg = useStaged("design/outline.svg");
  const pin = useStaged("design/pin.json");
  const placed = NOTICE_PINS.reduce((sum, p, i) => (frame >= start(i) + PIN_LANDS ? sum + p.count : sum), 0);
  const settled = interpolate(frame, [DONE, DONE + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Backdrop>
      {svg && <Outline svg={svg} />}
      {pin && (
        <AbsoluteFill>
          {NOTICE_PINS.map((p, i) => (
            <Pin key={p.district} data={pin} x={p.x} y={p.y} frame={frame - start(i)} />
          ))}
        </AbsoluteFill>
      )}
      <div style={{ ...SAFE, right: 1920 - MAP_LEFT + 40 }}>
        <div style={kicker}>State farm lease notices</div>
        <div style={{ flexGrow: 1 }} />
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 220,
            lineHeight: 1,
            letterSpacing: -8,
            color: PALETTE.accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {placed}
        </div>
        <div style={{ fontSize: 38, marginTop: 18 }}>{`of ${COUNTS.notices} notices, placed by district`}</div>
        <div
          style={{
            fontSize: 28,
            color: PALETTE.muted,
            marginTop: 28,
            lineHeight: 1.35,
            opacity: settled,
          }}
        >
          Pins mark districts, not farm locations.
          {UNPLACED === 1 && " 1 notice awaits confirmation of its district."}
          {UNPLACED > 1 && ` ${UNPLACED} notices await confirmation of their districts.`}
        </div>
        <div style={{ flexGrow: 1 }} />
        <div style={source}>{SOURCES.notices}</div>
      </div>
    </Backdrop>
  );
}
