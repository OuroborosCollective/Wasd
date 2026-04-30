export const INTERACT_DISTANCE = 25;

export interface InteractPoint {
  x: number;
  y: number;
}

export interface InteractNpcSnapshot {
  id: string;
  position: InteractPoint;
  isDead?: boolean;
}

export interface InteractLootSnapshot {
  id: string;
  position: InteractPoint;
}

export interface InteractWorldSnapshot {
  npcs: InteractNpcSnapshot[];
  loot: InteractLootSnapshot[];
  player?: { position: InteractPoint } | null;
}

export interface ClosestInteractable {
  id: string;
  interactionType: 'npc' | 'loot';
  distance: number;
}

export function getClosestNpc(pos: any, npcs: InteractNpcSnapshot[]): InteractNpcSnapshot | null {
  const p = pos?.position || pos;
  if (!p) return null;
  let closest = null;
  let minDist = INTERACT_DISTANCE;
  for (const npc of npcs) {
    if (npc.isDead) continue;
    const d = Math.sqrt(Math.pow(p.x - npc.position.x, 2) + Math.pow(p.y - npc.position.y, 2));
    if (d <= minDist) {
      minDist = d;
      closest = npc;
    }
  }
  return closest;
}

export function getClosestInteractable(pos: any, world: InteractWorldSnapshot): ClosestInteractable | null {
  const p = pos?.position || pos;
  if (!p) return null;
  let closest: ClosestInteractable | null = null;
  let minDist = INTERACT_DISTANCE;

  // Prioritize loot
  for (const loot of world.loot) {
    const d = Math.sqrt(Math.pow(p.x - loot.position.x, 2) + Math.pow(p.y - loot.position.y, 2));
    if (d <= minDist) {
      minDist = d;
      closest = { id: loot.id, interactionType: 'loot', distance: d };
    }
  }

  if (closest) return closest;

  for (const npc of world.npcs) {
    if (npc.isDead) continue;
    const d = Math.sqrt(Math.pow(p.x - npc.position.x, 2) + Math.pow(p.y - npc.position.y, 2));
    if (d <= minDist) {
      minDist = d;
      closest = { id: npc.id, interactionType: 'npc', distance: d };
    }
  }

  return closest;
}
