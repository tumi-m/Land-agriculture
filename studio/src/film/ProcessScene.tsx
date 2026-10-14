/**
 * Process: what happens after the closing day, drawn to scale. Each stage
 * is a bar that starts where the one before it ends, so the chart reads as
 * the calendar it is. Remotion springs grow each bar in turn.
 */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, SAFE, kicker, source } from "./Brand";
import { PROCESS, SOURCES } from "./data";
import { STAGE_STEP } from "./timeline";
import { PALETTE } from "./theme";
import { FONTS } from "../lib/fonts";

const WIDTH = 1680;
const dayX = (days: number) => (days / PROCESS.totalDays) * WIDTH;
const STARTS = PROCESS.stages.map((_, i) => PROCESS.stages.slice(0, i).reduce((sum, s) => sum + s.days, 0));
const FIRST = 14;
/** Day marks on the axis: every 30 days, and the end. */
const TICKS = [0, 30, 60, PROCESS.totalDays];

export function ProcessScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (at: number) => spring({ frame: frame - at, fps, config: { damping: 200 } });
  const days = Math.round(
    interpolate(frame, [0, 40], [0, PROCESS.totalDays], { extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 }),
  );

  return (
    <Backdrop>
      <div style={SAFE}>
        <div style={kicker}>After the closing day</div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 72,
            letterSpacing: -2,
            marginTop: 14,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {`About ${days} days to a signed lease`}
        </div>
        <div style={{ position: "relative", marginTop: 56, flexGrow: 1 }}>
          {PROCESS.stages.map((stage, i) => {
            const t = enter(FIRST + i * STAGE_STEP);
            return (
              <div
                key={stage.id}
                style={{
                  position: "absolute",
                  top: i * 112,
                  left: dayX(STARTS[i]),
                  opacity: t,
                  transform: `translateY(${(1 - t) * 16}px)`,
                }}
              >
                <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 28, whiteSpace: "nowrap" }}>
                  {stage.actor}
                </div>
                <div style={{ fontSize: 22, color: PALETTE.muted, marginTop: 4, whiteSpace: "nowrap" }}>{stage.name}</div>
                <div style={{ position: "relative", marginTop: 10, height: 20 }}>
                  <div
                    style={{
                      width: Math.max(8, dayX(stage.days) * t),
                      height: 20,
                      borderRadius: 10,
                      background: PALETTE.accent,
                    }}
                  />
                  {/* After the bar, or before it when the bar runs to the edge. */}
                  <div
                    style={{
                      position: "absolute",
                      top: -4,
                      ...(STARTS[i] + stage.days > PROCESS.totalDays * 0.8
                        ? { right: `calc(100% + 14px)` }
                        : { left: Math.max(8, dayX(stage.days)) + 14 }),
                      fontSize: 22,
                      color: PALETTE.accent,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stage.duration}
                  </div>
                </div>
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              top: PROCESS.stages.length * 112 + 8,
              left: 0,
              width: WIDTH,
              borderTop: `2px solid ${PALETTE.grid}`,
              opacity: enter(FIRST),
            }}
          >
            {TICKS.map((d) => (
              <div
                key={d}
                style={{
                  position: "absolute",
                  left: dayX(d),
                  top: 10,
                  transform: d === PROCESS.totalDays ? "translateX(-100%)" : undefined,
                  fontSize: 20,
                  color: PALETTE.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {`day ${d}`}
              </div>
            ))}
          </div>
        </div>
        <div style={source}>{SOURCES.process}</div>
      </div>
    </Backdrop>
  );
}
