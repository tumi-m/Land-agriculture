/**
 * Lets WebGL and MapLibre read the CSS tokens from src/styles/tokens.css.
 *
 * Call readToken() inside effects or event handlers, never at module scope:
 * the 3D components render on the server first, where there is no document.
 */

/**
 * Turns a "R G B" token triplet into an "rgb(R, G, B)" colour string. Comma
 * syntax on purpose: three.js, MapLibre and canvas all parse it, while the
 * space syntax the tokens file uses is CSS Color 4 and not universal.
 */
export function parseTokenTriplet(value: string): string {
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`tokens: expected an "R G B" triplet, got "${value}"`);
  }
  return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
}

/** Reads one token (for example "--clay") as an rgb() colour string. */
export function readToken(name: string): string {
  if (typeof document === "undefined") {
    throw new Error(`tokens: readToken("${name}") needs a browser document`);
  }
  return parseTokenTriplet(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
}

export type ThemeName = "light" | "dark";

function currentTheme(): ThemeName {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

/**
 * Calls back with the current theme now and whenever the `dark` class on
 * <html> changes. Returns a function that stops watching.
 */
export function onThemeChange(callback: (theme: ThemeName) => void): () => void {
  callback(currentTheme());
  const observer = new MutationObserver(() => callback(currentTheme()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}
