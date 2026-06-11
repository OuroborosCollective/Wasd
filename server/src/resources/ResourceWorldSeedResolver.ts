export const LEGACY_RESOURCE_WORLD_SEED = "areloria:legacy-resource-seed"; // STATELESS_AUDIT_ALLOW

export function resolveResourceWorldSeed(worldSeed: string | null | undefined): string {
  const trimmed = typeof worldSeed === "string" ? worldSeed.trim() : "";
  return trimmed.length > 0 ? trimmed : LEGACY_RESOURCE_WORLD_SEED;
}
