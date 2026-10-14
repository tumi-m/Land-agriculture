/**
 * Your form travels the chain: district office, three committees, the land
 * administration unit. The day counter runs at the pace of the guide's
 * approximate durations, so a long stage holds the form for longer.
 */
import { Line, Rect, Txt, makeScene2D } from "@motion-canvas/2d";
import {
  all,
  createRef,
  createRefArray,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  linear,
  sequence,
  waitFor,
} from "@motion-canvas/core";
import { PROCESS, SOURCES } from "../../src/film/data";
import { PALETTE } from "../../src/film/theme";

const DISPLAY = "Manrope";
const BODY = "Inter";
const W = 300;
const GAP = 60;
const xs = PROCESS.stages.map((_, i) => (i - (PROCESS.stages.length - 1) / 2) * (W + GAP));
const NODE_Y = 40;
const TOKEN_Y = -150;
/** Seconds of screen time per day of process, after a short floor per stage. */
const SECONDS_PER_DAY = 7 / PROCESS.totalDays;

export default makeScene2D(function* (view) {
  const day = createSignal(0);
  const nodes = createRefArray<Rect>();
  const durations = createRefArray<Txt>();
  const arrows = createRefArray<Line>();
  const token = createRef<Rect>();
  const heading = createRef<Rect>();
  const counter = createRef<Txt>();
  const ending = createRef<Txt>();
  const source = createRef<Txt>();

  view.add(
    <>
      <Rect ref={heading} x={-840} y={-400} offset={[-1, 0]} layout direction="column" gap={10} opacity={0}>
        <Txt text="AFTER THE CLOSING DAY" fontFamily={BODY} fontSize={22} letterSpacing={5} fill={PALETTE.muted} />
        <Txt text="What happens to your form" fontFamily={DISPLAY} fontWeight={700} fontSize={60} fill={PALETTE.ink} />
      </Rect>
      <Txt
        ref={counter}
        x={840}
        y={-380}
        offset={[1, 0]}
        text={() => `Day ${Math.round(day())}`}
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={64}
        fill={PALETTE.accent}
        opacity={0}
      />
      {PROCESS.stages.slice(1).map((_, i) => (
        <Line
          ref={arrows}
          points={[
            [xs[i] + W / 2 + 10, NODE_Y],
            [xs[i + 1] - W / 2 - 10, NODE_Y],
          ]}
          stroke={PALETTE.muted}
          lineWidth={4}
          endArrow
          arrowSize={12}
          end={0}
        />
      ))}
      {/* Flat lists: the scene graph does not flatten a fragment inside a map. */}
      {PROCESS.stages.map((stage, i) => (
        <Rect
          ref={nodes}
          x={xs[i]}
          y={NODE_Y + 30}
          width={W}
          height={250}
          radius={20}
          fill={PALETTE.stageTop}
          stroke={PALETTE.grid}
          lineWidth={3}
          layout
          direction="column"
          padding={24}
          gap={12}
          opacity={0}
        >
          <Txt text={stage.actor} fontFamily={DISPLAY} fontWeight={700} fontSize={28} fill={PALETTE.ink} textWrap width={W - 48} />
          <Txt text={stage.name} fontFamily={BODY} fontSize={22} fill={PALETTE.muted} textWrap width={W - 48} />
        </Rect>
      ))}
      {PROCESS.stages.map((stage, i) => (
        <Txt
          ref={durations}
          x={xs[i]}
          y={NODE_Y + 175}
          text={stage.duration}
          fontFamily={BODY}
          fontSize={24}
          fill={PALETTE.accent}
          opacity={0}
        />
      ))}
      <Rect
        ref={token}
        x={xs[0]}
        y={TOKEN_Y - 40}
        width={190}
        height={56}
        radius={28}
        fill={PALETTE.accent}
        layout
        alignItems="center"
        justifyContent="center"
        opacity={0}
      >
        <Txt text="Your form" fontFamily={DISPLAY} fontWeight={700} fontSize={24} fill={PALETTE.stageBottom} />
      </Rect>
      <Txt
        ref={ending}
        y={330}
        text={`Signed lease: about ${PROCESS.totalDays} days after the closing day.\nNot chosen? You are told in writing and can appeal to the Land Allocation Appeals Committee.`}
        fontFamily={BODY}
        fontSize={28}
        lineHeight={44}
        textAlign="center"
        fill={PALETTE.ink}
        opacity={0}
      />
      <Txt ref={source} x={-840} y={460} offset={[-1, 0]} text={SOURCES.process} fontFamily={BODY} fontSize={20} fill={PALETTE.muted} opacity={0} />
    </>,
  );

  // The chain assembles.
  yield* all(heading().opacity(1, 0.6), counter().opacity(1, 0.6), source().opacity(1, 0.6));
  yield* sequence(
    0.12,
    ...nodes.map((node) => all(node.opacity(1, 0.5), node.y(NODE_Y, 0.5, easeOutCubic))),
  );
  yield* sequence(0.1, ...arrows.map((arrow) => arrow.end(1, 0.4, easeInOutCubic)));

  // The form arrives, then waits at each stage for as long as the stage takes.
  yield* all(token().opacity(1, 0.4), token().y(TOKEN_Y, 0.4, easeOutCubic));
  let elapsed = 0;
  for (let i = 0; i < PROCESS.stages.length; i++) {
    const stage = PROCESS.stages[i];
    if (i > 0) yield* token().x(xs[i], 0.6, easeInOutCubic);
    yield* all(
      nodes[i].stroke(PALETTE.accent, 0.3),
      nodes[i].scale(1.05, 0.3, easeOutCubic),
      durations[i].opacity(1, 0.3),
    );
    elapsed += stage.days;
    yield* day(elapsed, 0.5 + stage.days * SECONDS_PER_DAY, linear);
    yield* nodes[i].scale(1, 0.3, easeInOutCubic);
  }

  yield* all(token().y(TOKEN_Y - 20, 0.4), ending().opacity(1, 0.6));
  yield* waitFor(2.5);
});
