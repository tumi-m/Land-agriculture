/**
 * Ray picking for the exploded model. Pointer events happen in DOM
 * coordinates; three.js wants normalised device coordinates. This module
 * keeps that conversion and the "what is pickable right now" rule in one
 * place so a tap and a hover agree, and so a test can pin the arithmetic
 * without a renderer.
 */
import * as THREE from "three";
import type { Piece } from "./pieces";

export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Maps a pointer position to the normalised device coordinates three.js
 * raycasting expects: -1..1, y up.
 */
export function normalisedPointer(
  clientX: number,
  clientY: number,
  rect: CanvasRect,
  out = new THREE.Vector2(),
): THREE.Vector2 {
  return out.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/**
 * A pointer that moved more than this many pixels between down and up is a
 * drag (orbiting the model), not a tap (choosing a piece).
 */
export const TAP_SLOP_PX = 6;

export function isTap(
  start: { x: number; y: number } | null,
  end: { x: number; y: number },
  slop = TAP_SLOP_PX,
): boolean {
  return (
    start !== null && Math.hypot(end.x - start.x, end.y - start.y) <= slop
  );
}

/**
 * The meshes a pointer may hit: the selected province's districts once one is
 * open, otherwise the province plates. Invisible meshes (a hidden layer) are
 * skipped so a tap falls through to what is drawn.
 */
export function pickableMeshes(
  provinces: Piece[],
  districts: Piece[],
  selected: string | null,
): THREE.Mesh[] {
  const pool = selected
    ? districts.filter((piece) => piece.province === selected)
    : provinces;
  return pool.flatMap((piece) => piece.meshes.filter((mesh) => mesh.visible));
}

/** First intersection along the ray, or null. */
export function firstHit(
  raycaster: THREE.Raycaster,
  meshes: THREE.Mesh[],
): THREE.Intersection | null {
  return raycaster.intersectObjects(meshes, false)[0] ?? null;
}
