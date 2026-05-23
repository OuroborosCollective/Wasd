import type { ForestBiomeAssetEntry, ForestBiomeManifest } from './forestBiomePicker';
import { deterministicForestHash } from './forestBiomePicker';

export type ForestGatherSkill = 'foraging' | 'herbalism' | 'alchemy' | 'mining' | 'woodcutting';

export type ForestKappaCoordinate = {
  chunkX: number;
  chunkZ: number;
  tileX: number;
  tileZ: number;
  kappa?: number;
  logicalIndex?: number;
};

export type ForestResourceDefinition = {
  kind: string;
  resourceType: string;
  itemId: string;
  displayName: string;
  gatherSkill: ForestGatherSkill;
  questTags: string[];
  spawnThreshold: number;
  layer: number;
  size: { width: number; height: number; y?: number };
};

export type ForestResourceNode = {
  id: string;
  biome: 'forest';
  worldSeed: string | number;
  kappaCoordinate: Required<ForestKappaCoordinate>;
  definition: ForestResourceDefinition;
  asset: ForestBiomeAssetEntry;
};

export const FOREST_RESOURCE_DEFINITIONS: Record<string, ForestResourceDefinition> = {
  mushroom: { kind: 'mushroom', resourceType: 'forest_mushroom', itemId: 'forest_mushroom', displayName: 'Forest Mushroom', gatherSkill: 'foraging', questTags: ['forest', 'mushroom', 'alchemy', 'foraging', 'quest_collectible'], spawnThreshold: 10, layer: 3, size: { width: 42, height: 42, y: 10 } },
  flower: { kind: 'flower', resourceType: 'forest_flower', itemId: 'forest_flower', displayName: 'Forest Flower', gatherSkill: 'herbalism', questTags: ['forest', 'flower', 'herb', 'healing', 'quest_collectible'], spawnThreshold: 9, layer: 3, size: { width: 42, height: 42, y: 10 } },
  fruit: { kind: 'fruit', resourceType: 'forest_fruit', itemId: 'forest_fruit', displayName: 'Forest Fruit', gatherSkill: 'foraging', questTags: ['forest', 'fruit', 'food', 'foraging', 'quest_collectible'], spawnThreshold: 5, layer: 3, size: { width: 42, height: 42, y: 6 } },
  moss: { kind: 'moss', resourceType: 'forest_moss', itemId: 'forest_moss', displayName: 'Forest Moss', gatherSkill: 'alchemy', questTags: ['forest', 'moss', 'alchemy', 'crafting', 'quest_collectible'], spawnThreshold: 11, layer: 2, size: { width: 54, height: 34, y: 10 } },
  rock: { kind: 'rock', resourceType: 'forest_stone', itemId: 'forest_stone', displayName: 'Forest Stone', gatherSkill: 'mining', questTags: ['forest', 'rock', 'stone', 'mining', 'crafting', 'quest_collectible'], spawnThreshold: 7, layer: 3, size: { width: 46, height: 40, y: 8 } },
  fern: { kind: 'fern', resourceType: 'forest_fern', itemId: 'forest_fern', displayName: 'Forest Fern', gatherSkill: 'herbalism', questTags: ['forest', 'fern', 'herb', 'foraging', 'quest_collectible'], spawnThreshold: 8, layer: 3, size: { width: 48, height: 48, y: 8 } },
  foliage: { kind: 'foliage', resourceType: 'forest_foliage', itemId: 'forest_foliage', displayName: 'Forest Foliage', gatherSkill: 'herbalism', questTags: ['forest', 'foliage', 'leaf', 'herb', 'crafting', 'quest_collectible'], spawnThreshold: 7, layer: 3, size: { width: 52, height: 48, y: 8 } },
  tree: { kind: 'tree', resourceType: 'forest_wood', itemId: 'forest_wood', displayName: 'Forest Wood', gatherSkill: 'woodcutting', questTags: ['forest', 'tree', 'wood', 'woodcutting', 'crafting', 'quest_collectible'], spawnThreshold: 4, layer: 4, size: { width: 92, height: 116, y: 0 } },
};

const KAPPA_INVARIANT = 1000;
const RESOURCE_KINDS = Object.keys(FOREST_RESOURCE_DEFINITIONS);

function normalizeKappaCoordinate(input: ForestKappaCoordinate): Required<ForestKappaCoordinate> {
  const kappa = input.kappa ?? KAPPA_INVARIANT;
  const logicalIndex = input.logicalIndex ?? deterministicForestHash(['forest-kappa-logical-index-v1', kappa, input.chunkX, input.chunkZ, input.tileX, input.tileZ]);
  return { chunkX: input.chunkX, chunkZ: input.chunkZ, tileX: input.tileX, tileZ: input.tileZ, kappa, logicalIndex };
}

export function pickForestResourceNode(manifest: ForestBiomeManifest | null, input: ForestKappaCoordinate & { worldSeed: string | number; allowedKinds?: string[] | null }): ForestResourceNode | null {
  if (!manifest) return null;
  const coord = normalizeKappaCoordinate(input);
  const kinds = (input.allowedKinds?.length ? input.allowedKinds : RESOURCE_KINDS).filter((kind) => FOREST_RESOURCE_DEFINITIONS[kind] && manifest.byKind[kind]?.length);
  if (kinds.length === 0) return null;
  const kindHash = deterministicForestHash(['forest-resource-kind-v1', input.worldSeed, coord.kappa, coord.logicalIndex, coord.chunkX, coord.chunkZ, coord.tileX, coord.tileZ]);
  const kind = kinds[kindHash % kinds.length];
  const definition = FOREST_RESOURCE_DEFINITIONS[kind];
  const chunkHash = deterministicForestHash(['forest-resource-spawn-v1', input.worldSeed, coord.kappa, coord.logicalIndex, coord.chunkX, coord.chunkZ, coord.tileX, coord.tileZ, kind]);
  if ((chunkHash % 100) >= definition.spawnThreshold) return null;
  const assetPool = manifest.byKind[kind] ?? [];
  if (assetPool.length === 0) return null;
  const assetHash = deterministicForestHash(['forest-resource-asset-v1', input.worldSeed, coord.kappa, coord.logicalIndex, coord.chunkX, coord.chunkZ, coord.tileX, coord.tileZ, kind]);
  const assetId = assetPool[assetHash % assetPool.length];
  const asset = assetId ? manifest.entries[assetId] : null;
  if (!asset) return null;
  const id = ['forest', definition.resourceType, `k${coord.kappa}`, `l${coord.logicalIndex}`, `c${coord.chunkX}_${coord.chunkZ}`, `t${coord.tileX}_${coord.tileZ}`, asset.id].join(':');
  return { id, biome: 'forest', worldSeed: input.worldSeed, kappaCoordinate: coord, definition, asset };
}

export function forestGatherIntent(node: ForestResourceNode) {
  return { type: 'GATHER_RESOURCE_INTENT', action: 'GATHER_RESOURCE_INTENT', resourceNodeId: node.id, resourceType: node.definition.resourceType, itemId: node.definition.itemId, kappaCoordinate: node.kappaCoordinate, assetId: node.asset.id, questTags: node.definition.questTags };
}
