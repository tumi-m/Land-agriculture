import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * The app's typefaces, served from public/fonts (staged by `npm run design`).
 * loadFont holds the render until each face is ready, so no frame is drawn
 * in a fallback font.
 */
export const FONTS = {
  display: "Manrope",
  body: "Inter",
} as const;

export const fontFiles = {
  display700: staticFile("fonts/manrope-700.woff"),
  display600: staticFile("fonts/manrope-600.woff"),
  body400: staticFile("fonts/inter-400.woff"),
};

void loadFont({ family: FONTS.display, url: fontFiles.display700, weight: "700" });
void loadFont({ family: FONTS.display, url: fontFiles.display600, weight: "600" });
void loadFont({ family: FONTS.body, url: fontFiles.body400, weight: "400" });
