/**
 * The brand lock-up and the stage behind every 2D scene, matching the title
 * card that scripts/design.tsx renders with Satori.
 */
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FONTS } from "../lib/fonts";
import { PALETTE } from "./theme";

export function Backdrop({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${PALETTE.stageTop}, ${PALETTE.stageBottom})`,
        color: PALETTE.ink,
        fontFamily: FONTS.body,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** The inset every 2D scene lays out in: the title card's margins. */
export const SAFE: CSSProperties = {
  position: "absolute",
  top: 110,
  left: 120,
  right: 120,
  bottom: 100,
  display: "flex",
  flexDirection: "column",
};

export function Mark({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div
        className="mark-tile"
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: PALETTE.ink,
          color: PALETTE.stageBottom,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: 44,
        }}
      >
        A
      </div>
      <div className="mark-words" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 40 }}>asbonge</div>
        <div style={{ fontSize: 18, letterSpacing: 4, color: PALETTE.muted }}>LAND &amp; OPPORTUNITY</div>
      </div>
    </div>
  );
}

export const kicker: CSSProperties = {
  fontSize: 22,
  letterSpacing: 5,
  textTransform: "uppercase",
  color: PALETTE.muted,
};

export const source: CSSProperties = {
  fontSize: 22,
  color: PALETTE.muted,
};
