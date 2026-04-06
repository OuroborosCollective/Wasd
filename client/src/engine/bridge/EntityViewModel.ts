export interface EntityViewModel {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  modelUrl?: string;
  visible: boolean;
  name?: string;
  role?: string;
  faction?: string;
  health?: number;
  maxHealth?: number;
  /** Server: hostile / enemy NPC (for client targeting UI) */
  combatThreat?: boolean;
  /** Server NPC id for combat lock (same as id for npc entities) */
  combatNpcId?: string;
  /** Server: gold pile vs item drop */
  lootKind?: "gold" | "item";
  goldAmount?: number;
  lootItemName?: string;
  lootItemId?: string;
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
