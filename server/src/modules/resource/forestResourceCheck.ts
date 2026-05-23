import { forestMath, forestWhole } from "./forestMath.js";
import { FOREST_KAPPA, FOREST_RESOURCE_RULES, FOREST_WORLD_SEED } from "./forestResourceRules.js";

export type ForestResourceCheck =
  | {
      ok: true;
      key: string;
      itemId: string;
      resourceType: string;
      coord: { chunkX: number; chunkZ: number; tileX: number; tileZ: number; kappa: number; logicalIndex: number };
    }
  | { ok: false; reason: string };

export function checkForestResource(input: any): ForestResourceCheck {
  const coord = input?.kappaCoordinate;
  const chunkX = forestWhole(coord?.chunkX);
  const chunkZ = forestWhole(coord?.chunkZ);
  const tileX = forestWhole(coord?.tileX);
  const tileZ = forestWhole(coord?.tileZ);
  const kappa = forestWhole(coord?.kappa ?? FOREST_KAPPA);

  if ([chunkX, chunkZ, tileX, tileZ, kappa].some((v) => v === null) || kappa !== FOREST_KAPPA) return { ok: false, reason: "bad_kappa" };

  const logicalIndex = forestWhole(coord?.logicalIndex ?? forestMath(["forest-kappa-logical-index-v1", kappa, chunkX!, chunkZ!, tileX!, tileZ!]));
  if (logicalIndex === null) return { ok: false, reason: "bad_logical_index" };

  const worldSeed = input?.worldSeed ?? FOREST_WORLD_SEED;
  const kindHash = forestMath(["forest-resource-kind-v1", worldSeed, kappa!, logicalIndex, chunkX!, chunkZ!, tileX!, tileZ!]);
  const rule = FOREST_RESOURCE_RULES[kindHash % FOREST_RESOURCE_RULES.length];
  const spawnHash = forestMath(["forest-resource-spawn-v1", worldSeed, kappa!, logicalIndex, chunkX!, chunkZ!, tileX!, tileZ!, rule.kind]);

  if ((spawnHash % 100) >= rule.threshold) return { ok: false, reason: "not_spawned" };
  if (input?.resourceType && input.resourceType !== rule.resourceType) return { ok: false, reason: "resource_mismatch" };
  if (input?.itemId && input.itemId !== rule.itemId) return { ok: false, reason: "item_mismatch" };

  const key = ["forest", rule.resourceType, `k${kappa}`, `l${logicalIndex}`, `c${chunkX}_${chunkZ}`, `t${tileX}_${tileZ}`, String(worldSeed)].join(":");
  return { ok: true, key, itemId: rule.itemId, resourceType: rule.resourceType, coord: { chunkX: chunkX!, chunkZ: chunkZ!, tileX: tileX!, tileZ: tileZ!, kappa: kappa!, logicalIndex } };
}

export function isNearForestResource(player: any, coord: { tileX: number; tileZ: number }, maxDistance: number): boolean {
  const px = Number(player?.position?.x ?? 0);
  const pz = Number(player?.position?.z ?? player?.position?.y ?? 0);
  return Number.isFinite(px) && Number.isFinite(pz) && Math.hypot(px - coord.tileX, pz - coord.tileZ) <= maxDistance;
}
