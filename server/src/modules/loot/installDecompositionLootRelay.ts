// MIGRATED: This module is deprecated - loot decomposition is now handled
// by the TickSystemRegistry via OuroborosTickSystem.
// This stub exists for backward compatibility during migration.

import { worldTickAdapter } from "../../core/are/WorldTickThinShellAdapter.js";

const installed = Symbol.for("areloria.decompositionLootRelay");

type DropProfile = {
  weaponChance: number;
  weaponClass: string;
  rarity: string;
  weaponIds: string[];
};

const DROP_PROFILES: Record<string, DropProfile> = {
  goblin: {
    weaponChance: 72,
    weaponClass: "dagger",
    rarity: "common",
    weaponIds: ["weapon_dagger_common_001", "weapon_dagger_common_002", "weapon_blade_common_001", "weapon_sword_common_001"],
  },
  bandit: {
    weaponChance: 78,
    weaponClass: "blade",
    rarity: "common",
    weaponIds: ["weapon_dagger_common_001", "weapon_blade_common_001", "weapon_sword_common_001", "weapon_sword_uncommon_001"],
  },
  guard: {
    weaponChance: 64,
    weaponClass: "sword",
    rarity: "uncommon",
    weaponIds: ["weapon_sword_common_001", "weapon_sword_uncommon_001", "weapon_spear_common_001", "weapon_shield_common_001"],
  },
  soldier: {
    weaponChance: 68,
    weaponClass: "sword",
    rarity: "uncommon",
    weaponIds: ["weapon_sword_uncommon_001", "weapon_spear_common_001", "weapon_spear_uncommon_001", "weapon_shield_common_001"],
  },
  default: {
    weaponChance: 18,
    weaponClass: "sword",
    rarity: "common",
    weaponIds: ["weapon_sword_common_001", "weapon_dagger_common_001", "weapon_blade_common_001"],
  },
};

function toWorldPosition(position: any): { x: number; y: number; z: number } {
  return {
    x: Number(position?.x ?? 0) / 1000,
    y: Number(position?.y ?? 0) / 1000,
    z: Number(position?.z ?? 0) / 1000,
  };
}

function deterministicHash(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicRoll(seed: string, modulo = 100): number {
  return deterministicHash(seed) % modulo;
}

function detectProfile(capsule: any): DropProfile | null {
  const identity = [
    capsule?.factionId,
    capsule?.npcType,
    capsule?.sourceNpcType,
    capsule?.sourceNpcId,
    capsule?.npcName,
  ].filter(Boolean).join(":").toLowerCase();

  if (identity.includes("animal") || identity.includes("beast") || identity.includes("wolf")) return null;
  if (identity.includes("goblin")) return DROP_PROFILES.goblin;
  if (identity.includes("bandit")) return DROP_PROFILES.bandit;
  if (identity.includes("guard")) return DROP_PROFILES.guard;
  if (identity.includes("soldier")) return DROP_PROFILES.soldier;
  return DROP_PROFILES.default;
}

function createDropItem(capsule: any, fallbackItem: any): any {
  const seed = [capsule?.sourceNpcId, capsule?.tick, capsule?.kappaHash, capsule?.factionId].map((v) => String(v ?? "0")).join(":");
  const profile = detectProfile(capsule);
  const position = toWorldPosition(capsule?.position);

  if (profile && deterministicRoll(`${seed}:weapon`) < profile.weaponChance) {
    const weaponVisualId = profile.weaponIds[deterministicRoll(`${seed}:weaponVisual`, profile.weaponIds.length)] ?? profile.weaponIds[0];
    const id = `weapon:${deterministicHash(`${seed}:${weaponVisualId}`).toString(36)}`;
    return {
      id,
      name: weaponVisualId,
      type: "weapon",
      weaponClass: profile.weaponClass,
      rarity: profile.rarity,
      seed,
      visualId: weaponVisualId,
      weaponVisualId,
      x: position.x,
      y: position.y,
    };
  }

  return {
    id: String(fallbackItem?.itemId ?? "energy_core"),
    name: String(fallbackItem?.itemId ?? "Energy Core"),
    type: "loot_capsule",
    quantity: Number(fallbackItem?.count ?? 1),
    gold: Number(capsule?.gold ?? 0),
  };
}

/**
 * @deprecated MIGRATED: This function is deprecated.
 * Loot decomposition is now handled by OuroborosTickSystem via TickSystemRegistry.
 * This stub exists for backward compatibility during migration.
 */
export function installDecompositionLootRelay(): void {
  // No-op: Loot decomposition is now handled by OuroborosTickSystem
  // This module was modifying WorldTick.prototype which is no longer supported
  console.log('[installDecompositionLootRelay] DEPRECATED: Loot decomposition now handled by OuroborosTickSystem');
}
