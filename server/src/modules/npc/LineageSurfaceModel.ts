import type { FamilyHouseRegistry } from './FamilyHouseRegistry';

export interface LineageSurfaceHouse {
  readonly id: string;
  readonly title: string;
  readonly settlementId: string;
  readonly population: number;
  readonly active: boolean;
}

export interface LineageSurfaceNode {
  readonly id: string;
  readonly lineageHash: string;
  readonly houseId: string;
  readonly settlementId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LineageSurfaceModel {
  readonly schemaVersion: 'lineage-surface-model.v1';
  readonly tick: number;
  readonly houses: readonly LineageSurfaceHouse[];
  readonly nodes: readonly LineageSurfaceNode[];
}

function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function lineageSurfaceCoordinate(seed: string, salt: string, span: number): number {
  return (hash32(`${seed}:${salt}`) % span) - Math.floor(span / 2);
}

export function createLineageSurfaceModel(registry: FamilyHouseRegistry, tick: number): LineageSurfaceModel {
  const snapshot = registry.serialize();
  const houses = snapshot.houses.map((house) => ({
    id: house.id,
    title: house.houseName,
    settlementId: house.settlementId,
    population: house.currentPopulation,
    active: house.isActive,
  })).sort((a, b) => a.id.localeCompare(b.id));
  const nodes = snapshot.lineages.map((lineage) => ({
    id: lineage.id,
    lineageHash: lineage.lineageHash,
    houseId: lineage.houseId,
    settlementId: lineage.settlementId,
    x: lineageSurfaceCoordinate(lineage.lineageHash, 'x', 512),
    y: lineageSurfaceCoordinate(lineage.lineageHash, 'y', 512),
    z: lineageSurfaceCoordinate(lineage.lineageHash, 'z', 96),
  })).sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({ schemaVersion: 'lineage-surface-model.v1', tick, houses: Object.freeze(houses), nodes: Object.freeze(nodes) });
}
