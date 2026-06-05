/**
 * SKILL GAMEPLAY EVENT BRIDGE
 *
 * Bridges gameplay events (NPC kills, resource gathering) to skill XP gains.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative XP gains
 */

import { getSkillProgressionService } from "./skillRuntime.js";
import type { SkillId } from "./SkillTypes.js";

/**
 * Combat XP awarded per NPC kill.
 * Deterministic constant.
 */
const COMBAT_XP_PER_KILL = 25;

/**
 * Map resource kinds to skill IDs.
 * Deterministic mapping.
 */
export function skillForResource(resourceKind: string): SkillId | null {
  const mapping: Record<string, SkillId> = {
    tree: "woodcutting",
    ore: "mining",
    fish: "fishing",
    wood: "woodcutting",
    stone: "mining",
  };
  return mapping[resourceKind] ?? null;
}

/**
 * Bridge an NPC kill event to combat XP.
 * Called when an NPC is confirmed killed.
 */
export async function bridgeNpcKillToCombatXp(playerId: string): Promise<void> {
  try {
    const service = await getSkillProgressionService();
    await service.applyEvent({
      type: "skill_xp_gain",
      playerId,
      skillId: "combat",
      amount: COMBAT_XP_PER_KILL,
      source: "npc_kill",
    });
  } catch (error) {
    // Never crash gameplay because skill XP failed.
    console.error("[skill-bridge] Failed to apply combat XP for NPC kill:", error);
  }
}

/**
 * Bridge a resource gather event to skill XP.
 * Called when a resource is successfully gathered.
 */
export async function bridgeResourceGatherToSkillXp(
  playerId: string,
  resourceKind: string,
  amount = 10
): Promise<void> {
  const skillId = skillForResource(resourceKind);
  if (!skillId) return;

  try {
    const service = await getSkillProgressionService();
    await service.applyEvent({
      type: "skill_xp_gain",
      playerId,
      skillId,
      amount: Math.max(1, Math.floor(amount)),
      source: "resource_gather",
    });
  } catch (error) {
    console.error("[skill-bridge] Failed to apply resource gather XP:", error);
  }
}