/**
 * The image a link to the site unfurls into. Satori (through next/og) draws
 * it from the app's own numbers at build time, in the app's typefaces, with
 * the source and date under the figures as on every screen of the app.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CARD } from "@/design/ramps";

export const SHARE_SIZE = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

export async function shareCard({
  headline,
  subtitle,
  figures,
  source,
}: {
  headline: string;
  subtitle: string;
  figures: string[];
  source: string;
}) {
  const [manrope, inter] = await Promise.all([font("manrope-700.woff"), font("inter-400.woff")]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(160deg, ${CARD.stageTop}, ${CARD.stageBottom})`,
          color: CARD.ink,
          fontFamily: "Inter",
        }}
      >
        {/* Satori adds padding to a box's size, so the margin is an inset box. */}
        <div style={{ position: "absolute", top: 64, left: 72, right: 72, bottom: 56, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 11,
                background: CARD.ink,
                color: CARD.stageBottom,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Manrope",
                fontSize: 30,
              }}
            >
              A
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "Manrope", fontSize: 27 }}>asbonge</div>
              <div style={{ fontSize: 12, letterSpacing: 3, color: CARD.muted }}>LAND &amp; OPPORTUNITY</div>
            </div>
          </div>
          <div style={{ display: "flex", flexGrow: 1 }} />
          <div style={{ fontFamily: "Manrope", fontSize: 88, letterSpacing: -3, lineHeight: 1 }}>{headline}</div>
          <div style={{ fontSize: 28, color: CARD.muted, marginTop: 20, maxWidth: 900 }}>{subtitle}</div>
          <div style={{ display: "flex", gap: 36, marginTop: 40, fontFamily: "Manrope", fontSize: 28, color: CARD.accent }}>
            {figures.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </div>
          <div style={{ fontSize: 15, color: CARD.muted, marginTop: 12 }}>{source}</div>
        </div>
      </div>
    ),
    {
      ...SHARE_SIZE,
      fonts: [
        { name: "Manrope", data: manrope, weight: 700, style: "normal" },
        { name: "Inter", data: inter, weight: 400, style: "normal" },
      ],
    },
  );
}
