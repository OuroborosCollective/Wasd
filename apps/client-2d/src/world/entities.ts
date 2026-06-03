export type EntityKind = "player" | "npc" | "loot" | "marker";

export interface EntityState {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp?: number;
  maxHp?: number;
  name?: string;
}

export interface WorldViewState {
  tickId: number;
  localPlayerId: string;
  entities: EntityState[];
}

export function cloneEntity(entity: EntityState): EntityState {
  return { ...entity };
}

export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);

  if (len <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / len,
    y: y / len
  };
}