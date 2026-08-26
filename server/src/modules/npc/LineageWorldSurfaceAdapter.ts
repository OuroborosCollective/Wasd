import type { LiveGameplayWorldSurface } from '../../gameplay/LiveGameplaySnapshotTypes.js';
import type { LineageSurfaceModel } from './LineageSurfaceModel';

export function lineageSurfaceToWorldSurface(surface: LineageSurfaceModel): LiveGameplayWorldSurface {
  const groups = surface.houses.map((house) => Object.freeze({
    id: house.id,
    kind: 'lineage_house',
    title: house.title,
    settlementId: house.settlementId,
    population: house.population,
    active: house.active,
  })).sort((a, b) => a.id.localeCompare(b.id));

  const points = surface.nodes.map((node) => Object.freeze({
    id: node.id,
    kind: 'lineage_node',
    lineageHash: node.lineageHash,
    houseId: node.houseId,
    settlementId: node.settlementId,
    x: node.x,
    y: node.y,
    z: node.z,
  })).sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    schemaVersion: 'world-surface-model.v1',
    tick: surface.tick,
    groups: Object.freeze(groups),
    points: Object.freeze(points),
  });
}
