/**
 * After the closing day: the committee chain an application passes through,
 * with time drawn to the guide's approximate durations.
 */
import { makeProject } from "@motion-canvas/core";
import "@fontsource/manrope/700.css";
import "@fontsource/inter/400.css";
import process from "./scenes/process?scene";

// Canvas text draws in whatever font is ready, so wait for the app's own.
await Promise.all([document.fonts.load("700 32px Manrope"), document.fonts.load("400 22px Inter")]);

export default makeProject({ scenes: [process] });
