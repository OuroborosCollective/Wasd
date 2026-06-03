import type { EntityState } from "../world/entities";

export interface ReconciliationOptions {
  softSnapDistance: number;
  hardSnapDistance: number;
  smoothingFactor: number;
}

export const DEFAULT_RECONCILIATION_OPTIONS: ReconciliationOptions = {
  softSnapDistance: 8,
  hardSnapDistance: 160,
  smoothingFactor: 0.35
};

export function reconcileLocalEntity(
  localPredicted: EntityState,
  serverAuthoritative: EntityState,
  options: ReconciliationOptions = DEFAULT_RECONCILIATION_OPTIONS
): EntityState {
  const dx = serverAuthoritative.x - localPredicted.x;
  const dy = serverAuthoritative.y - localPredicted.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= options.softSnapDistance) {
    return {
      ...localPredicted,
      hp: serverAuthoritative.hp,
      maxHp: serverAuthoritative.maxHp,
      name: serverAuthoritative.name
    };
  }

  if (distance >= options.hardSnapDistance) {
    return {
      ...serverAuthoritative
    };
  }

  return {
    ...localPredicted,
    x: localPredicted.x + dx * options.smoothingFactor,
    y: localPredicted.y + dy * options.smoothingFactor,
    vx: serverAuthoritative.vx,
    vy: serverAuthoritative.vy,
    hp: serverAuthoritative.hp,
    maxHp: serverAuthoritative.maxHp,
    name: serverAuthoritative.name
  };
}