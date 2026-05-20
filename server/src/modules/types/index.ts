// @ARE-GUARD-EXEMPT: non-sim module
/** Shared gameplay types (minimal surface — extend as modules converge). */
export type UnknownRecord = Record<string, unknown>;

export interface EntityState {
  entityId: string;
  logicalIndex: number;
  position: { x: number; y: number; z?: number };
  health: number;
  buffStates?: Map<string, number>;
}
