/**
 * Client–server interaction helpers (2D plane: x/y matches Babylon x/z on the client).
 * Keep `INTERACT_DISTANCE` in sync with `server/src/config/GameConfig.ts` → `interactDistance`.
 */
export const INTERACT_DISTANCE = 25;

export type InteractPoint = { x: number; y: number };

export type InteractNpcSnapshot = { id: string; position: InteractPoint };
export type InteractLootSnapshot = { id: string; position: InteractPoint };

export type InteractWorldSnapshot = {
  player: { position: InteractPoint } | null;
  npcs: InteractNpcSnapshot[];
  loot: InteractLootSnapshot[];
};

export type ClosestInteractable =
  | { interactionType: "loot"; id: string; position: InteractPoint }
  | { interactionType: "npc"; id: string; position: InteractPoint };

function dist2(a: InteractPoint, b: InteractPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getClosestNpc(
  player: { position: InteractPoint },
  npcs: InteractNpcSnapshot[],
  maxDistance: number = Infinity
): InteractNpcSnapshot | null {
  let closest: InteractNpcSnapshot | null = null;
  let minDistance = Infinity;
  for (const npc of npcs) {
    const d = dist2(player.position, npc.position);
    if (d < minDistance) {
      minDistance = d;
      closest = npc;
    }
  }
  return minDistance < maxDistance ? closest : null;
}

/**
 * Loot wins over NPC when both are in range (same priority as previous client behaviour).
 */
export function getClosestInteractable(
  player: { position: InteractPoint },
  state: InteractWorldSnapshot,
  maxDistance: number = INTERACT_DISTANCE
): ClosestInteractable | null {
  let closest: ClosestInteractable | null = null;
  let minDistance = Infinity;

  for (const loot of state.loot) {
    const d = dist2(player.position, loot.position);
    if (d <= maxDistance && d < minDistance) {
      minDistance = d;
      closest = { interactionType: "loot", id: loot.id, position: loot.position };
    }
  }

  if (closest) return closest;

  for (const npc of state.npcs) {
    const d = dist2(player.position, npc.position);
    if (d <= maxDistance && d < minDistance) {
      minDistance = d;
      closest = { interactionType: "npc", id: npc.id, position: npc.position };
    }
  }

  return closest;
}
