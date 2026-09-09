/** Replaced with immutable literals by the reviewed capsule build, never runtime env. */
declare const __WASD_NPC_SOURCE_REVISION__: string;
declare const __WASD_NPC_SOURCE_SHA256__: string;

export const WASD_NPC_MEMORY_RULESET = "wasd-aurion-npc-memory.v4" as const;

export function npcAuthority() {
  if (typeof __WASD_NPC_SOURCE_REVISION__ !== "string" || !/^[a-f0-9]{40}$/.test(__WASD_NPC_SOURCE_REVISION__) ||
      typeof __WASD_NPC_SOURCE_SHA256__ !== "string" || !/^[a-f0-9]{64}$/.test(__WASD_NPC_SOURCE_SHA256__)) {
    throw new Error("WASD_NPC_COMPILED_AUTHORITY_REQUIRED");
  }
  return Object.freeze({ rulesetVersion: WASD_NPC_MEMORY_RULESET, sourceRevision: __WASD_NPC_SOURCE_REVISION__, sourceSha256: __WASD_NPC_SOURCE_SHA256__ });
}
