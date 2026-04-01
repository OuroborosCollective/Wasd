export interface EntityViewModel {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  modelUrl?: string;
  visible: boolean;
  name?: string;
  health?: number;
  maxHealth?: number;
  /** Server: gold pile vs item drop */
  lootKind?: "gold" | "item";
  goldAmount?: number;
  are?: {
    kappa: number;
    logicalIndex: number;
    phaseShift: number;
    resonance: number;
    plexity: number;
    chain: string;
    kappaPos: { x: number; y: number; z: number };
  };
}
