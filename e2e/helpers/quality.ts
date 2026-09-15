import type { Page } from "@playwright/test";

/**
 * The in-page half of the M0.3 quality harness. It runs inside
 * `page.evaluate` and measures six things about the current explorer state:
 *
 *   1. floating `[data-overlay]` controls and their boxes (today there are
 *      no data-overlay attributes; the control classes below stand in for
 *      "floats over the stage" until M1.5 tags them properly)
 *   2. overlapping visible text pairs among labels and chrome
 *   3. interactive elements whose touch target is under 44 px
 *   4. text whose computed colour fails WCAG AA against its background
 *   5. interactive elements without an accessible name
 *   6. cards that show "undefined", "NaN" or "[object Object]"
 *
 * Everything is pure geometry and computed styles, so two runs over the same
 * state produce identical numbers. No product code changes; the page is only
 * read, never mutated.
 */

export type QualityRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type QualityOverlay = {
  name: string;
  rect: QualityRect;
};

export type QualityProblem = {
  kind:
    | "text-overlap"
    | "small-target"
    | "low-contrast"
    | "missing-name"
    | "unrendered-value";
  subject: string;
  detail: string;
};

/** Overlay kinds the harness reports, one number per state. */
export type QualityReport = {
  state: string;
  viewport: { width: number; height: number };
  scheme: "light" | "dark";
  /** (1) Floating controls over the stage, with their boxes. */
  overlays: QualityOverlay[];
  /** (2)–(6): one entry per problem found. */
  problems: QualityProblem[];
};

export async function collectQuality(page: Page, state: string): Promise<QualityReport> {
  return page.evaluate(
    ({ stateName }: { stateName: string }) => {
      // Everything the measurement needs must live inside this function:
      // Playwright serializes only the function source into the page, so
      // module-level constants do not cross.
      const TEXT_SCOPE = [
        "[data-overlay]",
        "[data-chrome]",
        ".anatomy-label",
        ".anatomy-slice-label",
        ".anatomy-title",
        ".anatomy-breadcrumb",
        ".anatomy-tools",
        ".anatomy-source",
        ".anatomy-mobile-dock",
        ".anatomy-console",
        ".anatomy-dossier",
        ".map-selection-chip",
        ".map-legend",
        ".scene-controls",
        ".scene-instructions",
        ".map-heading",
      ].join(",");
      const TARGET_SCOPE =
        "a[href], button, input, select, textarea, [role='button'], [role='slider'], [tabindex]:not([tabindex='-1'])";
      const MIN_TARGET = 44;
      // --- helpers ---------------------------------------------------------
      const round1 = (n: number) => Math.round(n * 10) / 10;
      const rectOf = (el: Element): QualityRect => {
        const r = el.getBoundingClientRect();
        return {
          left: round1(r.left),
          top: round1(r.top),
          right: round1(r.right),
          bottom: round1(r.bottom),
          width: round1(r.width),
          height: round1(r.height),
        };
      };
      const nameOf = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const label =
          el.getAttribute("aria-label") ??
          (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        return label ? `${tag}[${label}]` : tag;
      };
      const isVisible = (el: Element): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) return false;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0.5 && r.height > 0.5;
      };
      const intersects = (a: QualityRect, b: QualityRect, tol = 2) => {
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return x > tol && y > tol;
      };

      const problems: QualityProblem[] = [];

      // (1) floating controls ----------------------------------------------
      // No data-overlay attributes exist yet; these classes are the elements
      // CSS absolutely-positions over the stage. M1.5 tags them data-overlay.
      const OVERLAY_SEL = [
        ".anatomy-tools",
        ".anatomy-mobile-dock",
        ".anatomy-console.is-open",
        ".anatomy-dossier",
        ".map-selection-chip",
        ".scene-controls",
        ".map-legend",
      ].join(",");
      const overlays: QualityOverlay[] = Array.from(
        document.querySelectorAll(OVERLAY_SEL),
      )
        .filter(isVisible)
        .map((el) => ({
          name: `${el.tagName.toLowerCase()}.${String(el.className).split(" ").filter(Boolean).slice(0, 2).join(".")}`,
          rect: rectOf(el),
        }));

      // (2) overlapping visible text pairs ---------------------------------
      const textEls = Array.from(document.querySelectorAll(TEXT_SCOPE))
        .filter(isVisible)
        .filter((el) => (el.textContent ?? "").trim().length > 0)
        .map((el) => ({ el, rect: rectOf(el) }));
      for (let i = 0; i < textEls.length; i++) {
        for (let j = i + 1; j < textEls.length; j++) {
          // Skip a node and its own descendant: nesting is not an overlap.
          if (textEls[i].el.contains(textEls[j].el)) continue;
          if (textEls[j].el.contains(textEls[i].el)) continue;
          if (intersects(textEls[i].rect, textEls[j].rect)) {
            problems.push({
              kind: "text-overlap",
              subject: `${nameOf(textEls[i].el)} / ${nameOf(textEls[j].el)}`,
              detail: `${textEls[i].rect.width}×${textEls[i].rect.height} meets ${textEls[j].rect.width}×${textEls[j].rect.height}`,
            });
          }
        }
      }

      // (3) touch targets under 44 px --------------------------------------
      for (const el of Array.from(document.querySelectorAll(TARGET_SCOPE)).filter(isVisible)) {
        const r = rectOf(el);
        if (r.width < MIN_TARGET || r.height < MIN_TARGET) {
          problems.push({
            kind: "small-target",
            subject: nameOf(el),
            detail: `${r.width}×${r.height} px, under ${MIN_TARGET} px`,
          });
        }
      }

      // (4) computed contrast vs background ---------------------------------
      const parseRgb = (value: string): [number, number, number, number] | null => {
        const m = value.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a] = m[1].split(",").map((p) => parseFloat(p));
        return [r, g, b, Number.isFinite(a) ? a : 1];
      };
      const channel = (c: number) => {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const luminance = ([r, g, b]: [number, number, number]) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      // Composite the element's background up the ancestor chain onto page
      // background so translucent surfaces measure what a reader sees.
      const backgroundOf = (el: HTMLElement): [number, number, number] => {
        let bg: [number, number, number, number] | null = null;
        let node: HTMLElement | null = el;
        while (node) {
          const parsed = parseRgb(getComputedStyle(node).backgroundColor);
          if (parsed && parsed[3] > 0) {
            if (!bg) {
              bg = parsed;
              if (parsed[3] === 1) break;
            }
          }
          node = node.parentElement;
        }
        if (!bg) return [255, 255, 255];
        const a = bg[3];
        return [bg[0] * a + 255 * (1 - a), bg[1] * a + 255 * (1 - a), bg[2] * a + 255 * (1 - a)];
      };
      for (const { el } of textEls) {
        const style = getComputedStyle(el);
        const fg = parseRgb(style.color);
        if (!fg) continue;
        // Blend the foreground with its background by its own alpha.
        const bg = backgroundOf(el);
        const a = fg[3];
        const on: [number, number, number] = [
          fg[0] * a + bg[0] * (1 - a),
          fg[1] * a + bg[1] * (1 - a),
          fg[2] * a + bg[2] * (1 - a),
        ];
        const ratio =
          (luminance(on) + 0.05) / (luminance(bg) + 0.05);
        const sorted = ratio >= 1 ? ratio : 1 / ratio;
        const fontSize = parseFloat(style.fontSize);
        const bold = parseInt(style.fontWeight, 10) >= 700;
        const large = fontSize >= 24 || (bold && fontSize >= 18.66);
        const required = large ? 3 : 4.5;
        if (sorted < required) {
          problems.push({
            kind: "low-contrast",
            subject: nameOf(el),
            detail: `${sorted.toFixed(2)}:1, needs ${required}:1`,
          });
        }
      }

      // (5) accessible names on interactive controls ------------------------
      const nameable =
        "a[href], button, input, select, textarea, [role='button'], [role='slider'], [role='switch'], [role='tab']";
      for (const el of Array.from(document.querySelectorAll(nameable)).filter(isVisible)) {
        const e = el as HTMLElement;
        const named =
          (e.getAttribute("aria-label") ?? "").trim() ||
          (e.getAttribute("aria-labelledby") ?? "").trim() ||
          (e.textContent ?? "").trim() ||
          (e instanceof HTMLInputElement && (e.labels?.length ?? 0) > 0);
        if (!named) {
          problems.push({
            kind: "missing-name",
            subject: nameOf(e),
            detail: "no text, no aria-label, no associated label",
          });
        }
      }

      // (6) cards showing raw undefined/NaN ---------------------------------
      const CARD_SEL = [
        ".anatomy-dossier",
        ".map-selection-chip",
        ".province-detail",
        ".farm-detail",
        "[data-chrome]",
      ].join(",");
      const BAD_VALUE = /\b(undefined|NaN|\[object Object\])\b/;
      for (const el of Array.from(document.querySelectorAll(CARD_SEL)).filter(isVisible)) {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        const hit = text.match(BAD_VALUE);
        if (hit) {
          problems.push({
            kind: "unrendered-value",
            subject: nameOf(el),
            detail: `shows "${hit[0]}"`,
          });
        }
      }

      return {
        state: stateName,
        viewport: { width: innerWidth, height: innerHeight },
        scheme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        overlays,
        problems,
      } satisfies QualityReport;
    },
    { stateName: state },
  );
}
