# Motion studio

Films, explainers, title cards and sound for the Land Locator, built from the app's own data and geometry. A separate npm package: the web app never installs or bundles anything here, and Vercel skips the folder (`.vercelignore`).

```sh
cd studio
npm ci
npm run loop     # brief → design → sound → render → review → ship
```

The working guide, including the rules every frame has to follow, is the `motion-studio` skill in `.agents/skills/motion-studio/SKILL.md`.

## What it makes

| | Source | Output |
| --- | --- | --- |
| Launch film, 25 s | `src/film/*` (Remotion) | `out/ship/launch.mp4`, `launch-720p.mp4`, `launch.webm`, `poster.jpg` |
| Process explainer, ~21 s | `explainers/` (Motion Canvas) | `out/explainers/process.mp4` |
| Title card and poster | `scripts/design.tsx` (Satori, SVGO, resvg) | `public/design/` |
| Score and interface cues | `scripts/sound.ts` | `public/sound/score.wav`, and `../public/sounds/` for the app |

The film runs five scenes: the title; the nine provinces falling into place in 3D (React Three Fiber, Rapier physics, Drei, postprocessing); the outline drawn on and a pin dropped on every district with a reviewed lease notice (GSAP DrawSVG, dotLottie); the five stages after the closing day, to scale; and the end card. Every number on screen is counted from the app's modules and carries its source and date.

## Environment

| Variable | Default | |
| --- | --- | --- |
| `REMOTION_GL` | `angle` | `swiftshader` where there is no GPU. |
| `REMOTION_BROWSER` | Remotion's own download | Path to a Chromium to render with, for the film and the explainers. |
| `SITE_URL` | none | Printed on the end card when set. |

Without a GPU the 3D scene renders at a few seconds a frame; the whole film takes about an hour on four cores.

## Review

`npm run review` fails the render unless it is 25 s of 1920 × 1080 at 30 fps with all 750 frames (counted by Mediabunny, independently of FFmpeg), has an audio track at −16 LUFS ± 1.5 with true peak under −1 dBTP, has no black gaps and nothing frozen for 1.5 s, and every scene has a picture on it. It writes `out/review/report.md`, `contact-sheet.png` and a still per scene: look at them before `npm run ship`.

## Licences

- **Remotion** is free for individuals, non-profits and for-profit organisations of up to three employees. A larger for-profit organisation needs a company licence from remotion.pro before rendering with this package.
- **GSAP**, plugins included, is free for commercial use under its standard licence (gsap.com/standard-license).
- **FFmpeg** comes from `ffmpeg-static` and `ffprobe-static`, GPL builds used here as tools and never shipped in the app. Remotion's own FFmpeg lacks the filters review needs.
- **Satori**, **Mediabunny** and **resvg** are MPL-2.0. The **Rapier** physics engine is Apache-2.0, and **postprocessing** is zlib. Motion Canvas, three.js, React Three Fiber, Drei, React Postprocessing, dotLottie and SVGO are MIT, as are the React Rapier bindings by their repository (the npm package ships no licence file).
- **Manrope** and **Inter** are OFL; `npm run design` copies their licences next to the font files.
- **Rive** is not used: it plays `.riv` files made in the Rive editor, and none has been made.
