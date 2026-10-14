/**
 * GSAP under Remotion: a timeline is built once, paused, and seeked to the
 * current frame on every render. GSAP never runs on its own clock, so a
 * frame looks the same whichever tab renders it and in whatever order.
 */
import { type RefObject, useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(DrawSVGPlugin, SplitText);

export { gsap, SplitText };

/**
 * Builds a paused timeline scoped to `scope` (selectors only match inside
 * it) and seeks it to the current frame. `build` runs once per `key`: pass
 * a key that changes when the DOM it animates is replaced.
 */
export function useTimeline(
  scope: RefObject<HTMLElement | SVGSVGElement | null>,
  build: (timeline: gsap.core.Timeline) => void,
  key: unknown = null,
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (!scope.current) return;
    const context = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      build(tl);
      timeline.current = tl;
    }, scope.current);
    return () => {
      timeline.current = null;
      context.revert();
    };
    // `build` is an inline function; the key says when to rebuild.
  }, [scope, key]);

  useLayoutEffect(() => {
    timeline.current?.seek(frame / fps, false);
  }, [frame, fps, key]);
}
