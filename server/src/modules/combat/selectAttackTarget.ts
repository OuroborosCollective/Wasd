/** Pure selection of NPC to hit — used by WorldTick and unit tests. */

export function npcIsCombatThreat(npc: { health?: number; faction?: string; role?: string }): boolean {
  if (!npc || (npc.health ?? 0) <= 0) return false;
  if (npc.faction === "Hostile") return true;
  if (npc.role === "Enemy") return true;
  return false;
}

export function npcIsCombatTarget(npc: {
  id?: string;
  health?: number;
  faction?: string;
  role?: string;
}): boolean {
  if (!npc || (npc.health ?? 0) <= 0) return false;
  if (npc.id === "npc_dummy" || npc.role === "Training") return true;
  return npcIsCombatThreat(npc);
}

export type AttackTargetPick = { npc: any; d2: number };

/**
 * Prefer nearest hostile in range, else nearest training dummy in range.
 * If `preferredNpcId` matches a valid in-range target, that NPC is chosen first.
 */
export function selectAttackTarget(
  px: number,
  py: number,
  maxRange: number,
  npcs: any[],
  preferredNpcId?: string | null
): AttackTargetPick | null {
  const maxD = maxRange;
  if (isNonEmptyId(preferredNpcId)) {
    for (const npc of npcs) {
      if (npc?.id !== preferredNpcId) continue;
      if (!npcIsCombatTarget(npc)) break;
      const dx = npc.position.x - px;
      const dy = npc.position.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 <= maxD * maxD) {
        return { npc, d2 };
      }
      break;
    }
  }
  let bestThreat: AttackTargetPick | null = null;
  let bestDummy: AttackTargetPick | null = null;
  for (const npc of npcs) {
    if (!npcIsCombatTarget(npc)) continue;
    const dx = npc.position.x - px;
    const dy = npc.position.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxD * maxD) continue;
    if (npcIsCombatThreat(npc)) {
      if (!bestThreat || d2 < bestThreat.d2) bestThreat = { npc, d2 };
    } else if (npc.id === "npc_dummy" || npc.role === "Training") {
      if (!bestDummy || d2 < bestDummy.d2) bestDummy = { npc, d2 };
    }
  }
  return bestThreat ?? bestDummy;
}

function isNonEmptyId(id: string | null | undefined): id is string {
  return typeof id === "string" && id.trim().length > 0;
}
