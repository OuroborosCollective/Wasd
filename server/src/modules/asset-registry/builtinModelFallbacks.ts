/**
 * Hard fallbacks when asset-pools.json / glb-links / Spacetime yield no path.
 * Must match files shipped under client/public/assets/models/ (or nginx equivalent).
 */
export const BUILTIN_GLB_BY_ENTITY_TYPE: Record<string, string> = {
  player: "/assets/models/characters/uschi.glb",
  npc: "/assets/models/characters/uschi.glb",
  monster: "/assets/models/monsters/goblin.glb",
  loot: "/assets/models/objects/chest.glb",
  object: "/assets/models/objects/chest.glb",
};

export function ensureGlbUrl(entityType: string, resolved?: string | null): string {
  const t = typeof resolved === "string" ? resolved.trim() : "";
  if (t.length > 0) return t;
  const key = entityType.trim().toLowerCase();
  return BUILTIN_GLB_BY_ENTITY_TYPE[key] ?? BUILTIN_GLB_BY_ENTITY_TYPE.object;
}
