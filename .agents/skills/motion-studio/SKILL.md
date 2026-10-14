---
name: motion-studio
description: Make films, explainers, share cards, sound and interface motion for the Land Locator. Use for any video, animated explainer, title card, social image, sound cue or UI animation work, in studio/ or in the app.
---

# Motion studio

Everything that moves, sounds or is rendered to a file. The films and explainers live in `studio/`, a separate npm package that the web app never installs or bundles. Interface motion lives in the app and is held to the app's rules in `AGENTS.md`.

Run `npm run skills` at the repo root first: it fetches the Remotion, GSAP and Motion skills at pinned commits into `.agents/skills/`. Read those for API detail; this file says how they fit together here.

## The loop

`brief → design → animate → build → sound → render → review → ship`, all from `studio/`:

| Step | Command | What it does |
| --- | --- | --- |
| brief | `npm run brief` | Prints `briefs/launch.md` and fails if `src/film/timeline.ts` is not the cut `briefs/launch.json` asks for. |
| design | `npm run design` | Satori title card and poster, SVGO-cleaned outline, the notice pin as Lottie; stages fonts and the dotLottie WebAssembly. |
| animate | `npm run studio` | Remotion Studio, to scrub and tune scenes. `npm run explainer` opens the Motion Canvas editor. |
| build | `npm run typecheck` | Both projects, the film and the explainers. |
| sound | `npm run sound` | Synthesises the score on the film's own timeline and the app's three cues; FFmpeg levels and encodes them. |
| render | `npm run render` | The master, `out/launch-master.mp4`. `npm run explainer:render` renders the explainers headless. |
| review | `npm run review` | Checks the master against the brief and writes `out/review/`: a report, a contact sheet and one still per scene. Look at them. |
| ship | `npm run ship` | MP4, 720p MP4, WebM and poster in `out/ship/`, each probed and checked against its size cap. |

`npm run loop` runs all of it. Without a GPU, set `REMOTION_GL=swiftshader`; to use an installed Chromium, set `REMOTION_BROWSER` to its path.

## Tools by layer

| Layer | Tool | Where | Use it for |
| --- | --- | --- | --- |
| Agent skills | Remotion, GSAP and Motion skills | `.agents/skills/` | API detail and idioms. |
| Video | Remotion | `studio/src` | Films: compositions, sequences, audio, rendering. |
| Explainers | Motion Canvas | `studio/explainers` | Diagram-led explainers written as generator code. |
| Timelines | GSAP (SplitText, DrawSVG) | `studio/src/lib/gsap.ts` | Text and SVG choreography inside a scene. |
| Interface motion | Motion | `src/lib/useSwipeDown.ts` | Springs that carry a gesture's velocity. |
| Interface motion | Anime.js | `src/components/explorer/AssemblingOutline.tsx` | SVG stroke drawing while the model builds. |
| 3D | three.js, React Three Fiber, Drei | `studio/src/film/CountryScene.tsx` | 3D scenes as React; text, cameras, outlines. |
| Physics | React Three Rapier | same | Rigid bodies, stepped once per video frame. |
| Post | React Postprocessing | same | Bloom, depth of field, vignette, tone mapping. |
| Vector | SVGO | `studio/scripts/design.tsx` | Clean every SVG before it is animated or rasterised. |
| Images | Satori | `studio/scripts/design.tsx`, `src/app/share-card.tsx` | JSX to SVG/PNG: title cards, posters, share cards. |
| Lottie | dotLottie | `studio/src/film/NoticesScene.tsx` | Small authored animations, set to an exact frame. |
| Sound | Howler | `src/lib/sound.ts` | The app's opt-in cues. |
| Media | Mediabunny | `studio/scripts/review.ts` | Reading containers and counting frames without FFmpeg. |
| Encode | FFmpeg | `studio/scripts/media.ts` | Loudness, black and frozen frame checks, encoding, contact sheets. |

Rive is not used: its runtime plays `.riv` files made in the Rive editor, and there is no way to author one from code. Add it when a designer supplies a `.riv`, behind a dynamic import like the cues.

## Rules for a frame

A rendered frame must be the same whichever browser tab draws it and in whatever order. So:

- Nothing animates on the wall clock. Everything derives from `useCurrentFrame()`.
- GSAP timelines are built paused and seeked to `frame / fps` (`useTimeline`). Never `play()`.
- Physics is paused and stepped `1 / fps` per frame from a snapshot; rewind by restoring the snapshot.
- dotLottie is never played: `setFrame()` on every frame.
- Hold the frame with `delayRender` until every asynchronous thing it shows is ready, then draw again. In the country scene that is four things: fonts, Drei text typesetting, the hull colliders (a render after the bodies mount) and the effect composer (two renders after it mounts). Each was a blank or broken frame before it was held.
- Take a hold in a layout effect, not during render: a render that suspends is thrown away and its hold is never released.
- Keep React away from the DOM a timeline animates. React 19 re-applies `dangerouslySetInnerHTML` whenever the prop is a new object, replacing the nodes GSAP holds; memoise it. A single still hides this, because it renders once: check motion with a short frame range (`npx remotion render … --frames=380-400 --sequence`), and let `npm run review` catch frozen stretches.

## Rules for content

The film and the cards say only what the app says, from the same modules (`src/content`, `src/lib/geo`, `src/data`). Every number carries its source and date on screen. Pins on a district mark the district, not a farm, and the film says so. Colours come from `src/design/ramps.ts` (`CARD`, `LAYERS`, `SCENE`).

## Rules for the app

Interface motion is optional garnish on an app that must work without it:

- Load motion and sound libraries with a dynamic import, at the moment they are needed. The first-load budget is in `scripts/budget.mjs`.
- Respect `prefers-reduced-motion`: show the end state, skip the animation.
- Sound is off until the reader turns it on, and never plays for a change the reader did not just make.

## Licences

Remotion is free for individuals, non-profits and for-profit organisations of up to three employees; a larger for-profit organisation needs a company licence (remotion.pro). GSAP, plugins included, is free for commercial use under its standard licence (gsap.com/standard-license); read its terms before building it into a product that makes animations for others. FFmpeg comes from `ffmpeg-static`, a GPL build used here as a tool, never shipped in the app. Satori, Mediabunny and resvg are MPL-2.0, Rapier is Apache-2.0, postprocessing is zlib; the rest is MIT. `studio/README.md` has the full list. Fonts are OFL, with their licences beside them.
