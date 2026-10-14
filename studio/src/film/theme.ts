/**
 * The film's palette: the app's model-stage colours, from the same module
 * the app's share cards and 3D stage read (src/design/ramps.ts), so a frame
 * of the film reads as the product.
 */
import { CARD, LAYERS, SCENE } from "@/design/ramps";

export const PALETTE = {
  ...CARD,
  land: LAYERS.land,
  soil: LAYERS.soil,
  water: LAYERS.climate,
  opportunity: LAYERS.opportunity,
  grid: SCENE.gridPrimary,
} as const;
