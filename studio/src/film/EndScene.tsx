/**
 * End: the brand and the promise, then a fade to the stage colour. The site
 * address is an input prop, never typed in: `--props='{"siteUrl":"…"}'`.
 */
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Mark } from "./Brand";
import { PALETTE } from "./theme";
import { FONTS } from "../lib/fonts";

export interface EndProps {
  siteUrl?: string;
}

export function EndScene({ siteUrl }: EndProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const rise = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{ opacity: rise, transform: `scale(${0.9 + rise * 0.1})` }}>
          <Mark />
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 120,
            letterSpacing: -5,
            opacity: rise,
            transform: `translateY(${(1 - rise) * 30}px)`,
          }}
        >
          Open the land.
        </div>
        {siteUrl && (
          <div style={{ fontSize: 36, color: PALETTE.accent, opacity: rise }}>{siteUrl}</div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: PALETTE.stageBottom, opacity: out }} />
    </Backdrop>
  );
}
