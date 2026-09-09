export interface MapInspection {
  coordinates: [number, number];
  elevation: number | null;
}
export type DetailState = "expanded" | "collapsed";
export function selectionDetailState(): DetailState {
  return "expanded";
}
export function toggleDetailState(state: DetailState): DetailState {
  return state === "expanded" ? "collapsed" : "expanded";
}
