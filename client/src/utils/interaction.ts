export function getClosestInteractable(
  playerPos: { x: number; y: number },
  npcs: any[],
  loot: any[]
): any | null {
  let closest: any = null;
  let minDist = Infinity;

  // Check loot first (higher priority)
  for (const item of loot) {
    const dist = Math.hypot(playerPos.x - item.position.x, playerPos.y - item.position.y);
    if (dist < 12 && dist < minDist) {
      minDist = dist;
      closest = { ...item, type: "loot" };
    }
  }

  // Then NPCs
  for (const npc of npcs) {
    const dist = Math.hypot(playerPos.x - npc.position.x, playerPos.y - npc.position.y);
    if (dist < 15 && dist < minDist) {
      minDist = dist;
      closest = { ...npc, type: "npc" };
    }
  }

  return closest;
}
