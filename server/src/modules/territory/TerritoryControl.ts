/**
 * Guild / territory influence (stub — extend with real map logic).
 */
export type SovereigntySample = {
  factionId?: string;
  influenceLevel?: number;
};

export const TerritoryControl = {
  applyGuildSovereignty(_position: { x: number; y: number; z?: number }): SovereigntySample | null {
    return null;
  },
};
