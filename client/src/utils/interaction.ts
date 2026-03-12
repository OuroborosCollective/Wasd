export function getClosestInteractable(player: any, state: any) {
  let closestInteractable = null;
  let minDistance = Infinity;

  // 1. Check Loot (Priority 1)
  if (state.loot) {
    for (const loot of state.loot) {
      const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
      if (dist < 30 && dist < minDistance) {
        minDistance = dist;
        closestInteractable = { ...loot, interactionType: 'loot' };
      }
    }
  }

  // 2. Check NPCs (Priority 2, only if no loot found)
  if (!closestInteractable && state.npcs) {
    for (const npc of state.npcs) {
      const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
      if (dist < 30 && dist < minDistance) {
        minDistance = dist;
        closestInteractable = { ...npc, interactionType: 'npc' };
      }
    }
  }
  return closestInteractable;
}
