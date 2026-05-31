import { createARESeed, SeededARERng } from '../../core/determinism/AREDeterminism.js';
import { type WorldEmergenceCollapsePayload, type KappaCoordinate } from './WorldEmergenceEvent';

export type ResonanceFieldEntry = {
  eventType: 'SOCIAL_SHOCK';
  sourceNpcId: string;
  sourceFactionId: string;
  moodShift: 'GRIEF' | 'AGGRESSION' | 'UNEASE';
  intensity: number;
  distance: number;
  tick: number;
  kappaHash: string;
};

export type LootCapsuleItem = {
  itemId: string;
  count: number;
  resonanceValue: number;
};

export type LootCapsule = {
  id: string;
  eventType: 'LOOT_CAPSULE';
  sourceNpcId: string;
  factionId: string;
  position: KappaCoordinate;
  tick: number;
  kappaHash: string;
  plexityTotal: number;
  items: LootCapsuleItem[];
  gold: number;
};

export type ResonanceNpc = {
  id: string;
  faction?: string;
  state?: string;
  position: { x: number; y: number; z?: number };
  memory?: any;
};

export type WorldResonanceResult = {
  event: WorldEmergenceCollapsePayload;
  lootCapsule: LootCapsule;
  affectedNpcIds: string[];
  resonanceFields: ResonanceFieldEntry[];
  shadowLog: Record<string, unknown>;
};

const DEFAULT_RADIUS = 40;
const GRID_CELL_SIZE = 40;

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function distance(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number {
  const dx = finite(a.x) - finite(b.x);
  const dy = finite(a.y) - finite(b.y);
  const dz = finite(a.z) - finite(b.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function worldPositionFromKappa(kappa: KappaCoordinate): { x: number; y: number; z: number } {
  return { x: finite(kappa.x) / 1000, y: finite(kappa.y) / 1000, z: finite(kappa.z) / 1000 };
}

function stableNumberFromHash(hash: string): number {
  let total = 0;
  for (let i = 0; i < hash.length; i += 1) total = (Math.imul(31, total) + hash.charCodeAt(i)) | 0;
  return Math.abs(total);
}

function spatialKey(pos: { x: number; y: number }): string {
  return `${Math.floor(finite(pos.x) / GRID_CELL_SIZE)}:${Math.floor(finite(pos.y) / GRID_CELL_SIZE)}`;
}

function neighborKeys(center: { x: number; y: number }): string[] {
  const cx = Math.floor(finite(center.x) / GRID_CELL_SIZE);
  const cy = Math.floor(finite(center.y) / GRID_CELL_SIZE);
  const keys: string[] = [];
  for (let x = cx - 1; x <= cx + 1; x += 1) {
    for (let y = cy - 1; y <= cy + 1; y += 1) keys.push(`${x}:${y}`);
  }
  return keys;
}

export class WorldResonanceAdapter {
  public handleDecomposition(event: WorldEmergenceCollapsePayload, activeNpcs: Iterable<ResonanceNpc>, radius = DEFAULT_RADIUS): WorldResonanceResult {
    const origin = worldPositionFromKappa(event.position);
    const grid = this.buildSpatialGrid(activeNpcs);
    const nearby = this.queryRadius(grid, origin, radius)
      .filter((npc) => npc.id !== event.npcId && npc.state !== 'decomposition')
      .sort((a, b) => {
        const idA = String(a.id);
        const idB = String(b.id);
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

    const resonanceFields: ResonanceFieldEntry[] = [];
    const affectedNpcIds: string[] = [];

    for (const npc of nearby) {
      const d = distance(origin, npc.position);
      if (d > radius) continue;
      const field = this.createResonanceField(event, npc, d, radius);
      npc.memory ??= {};
      npc.memory.resonanceFields ??= [];
      npc.memory.resonanceFields.push(field);
      resonanceFields.push(field);
      affectedNpcIds.push(npc.id);
    }

    const lootCapsule = this.createLootCapsule(event);
    const shadowLog = Object.freeze({
      type: 'NPC_DECOMPOSITION_EVENT',
      eventType: event.eventType,
      npcId: event.npcId,
      factionId: event.factionId,
      kappaCoordinate: event.position,
      finalKappaHash: event.kappaHash,
      plexityTotal: lootCapsule.plexityTotal,
      lootCapsuleId: lootCapsule.id,
      affectedNpcIds,
      affectedCount: affectedNpcIds.length,
      tick: event.tick,
    });

    return Object.freeze({ event, lootCapsule, affectedNpcIds, resonanceFields, shadowLog });
  }

  public createLootCapsule(event: WorldEmergenceCollapsePayload): LootCapsule {
    const plexityTotal = this.plexityFromEvent(event);
    const rng = new SeededARERng(createARESeed(['decomposition-loot-capsule', event.npcId, event.kappaHash, event.tick, plexityTotal]));
    const essenceCount = 1 + (plexityTotal % 3);
    const memoryShards = Math.max(1, Math.floor(plexityTotal / 333));
    const salt = rng.nextRange(0, 2);
    const items: LootCapsuleItem[] = [
      { itemId: 'resonance_essence', count: essenceCount, resonanceValue: plexityTotal },
      { itemId: 'memory_shard', count: memoryShards + salt, resonanceValue: Math.max(1, Math.floor(plexityTotal / 2)) },
    ];

    return Object.freeze({
      id: `loot:decomposition:${event.npcId}:${event.kappaHash}`,
      eventType: 'LOOT_CAPSULE' as const,
      sourceNpcId: event.npcId,
      factionId: event.factionId,
      position: event.position,
      tick: event.tick,
      kappaHash: event.kappaHash,
      plexityTotal,
      items,
      gold: Math.max(0, Math.floor(plexityTotal / 10)),
    });
  }

  private buildSpatialGrid(activeNpcs: Iterable<ResonanceNpc>): Map<string, ResonanceNpc[]> {
    const grid = new Map<string, ResonanceNpc[]>();
    for (const npc of activeNpcs) {
      if (!npc?.position) continue;
      const key = spatialKey(npc.position);
      const bucket = grid.get(key);
      if (bucket) bucket.push(npc);
      else grid.set(key, [npc]);
    }
    return grid;
  }

  private queryRadius(grid: Map<string, ResonanceNpc[]>, origin: { x: number; y: number; z: number }, radius: number): ResonanceNpc[] {
    const result: ResonanceNpc[] = [];
    const seen = new Set<string>();
    for (const key of neighborKeys(origin)) {
      const bucket = grid.get(key);
      if (!bucket) continue;
      for (const npc of bucket) {
        if (seen.has(npc.id)) continue;
        seen.add(npc.id);
        if (distance(origin, npc.position) <= radius) result.push(npc);
      }
    }
    return result;
  }

  private createResonanceField(event: WorldEmergenceCollapsePayload, npc: ResonanceNpc, distanceToOrigin: number, radius: number): ResonanceFieldEntry {
    const npcFaction = String(npc.faction ?? 'neutral');
    const sameFaction = npcFaction === event.factionId;
    const neutral = npcFaction === 'neutral' || event.factionId === 'neutral';
    const intensity = clamp(1 - (distanceToOrigin / Math.max(1, radius)));

    return Object.freeze({
      eventType: 'SOCIAL_SHOCK' as const,
      sourceNpcId: event.npcId,
      sourceFactionId: event.factionId,
      moodShift: sameFaction ? 'GRIEF' : neutral ? 'UNEASE' : 'AGGRESSION',
      intensity,
      distance: distanceToOrigin,
      tick: event.tick,
      kappaHash: event.kappaHash,
    });
  }

  private plexityFromEvent(event: WorldEmergenceCollapsePayload): number {
    const hashPressure = stableNumberFromHash(event.kappaHash) % 1000;
    const energyDelta = Math.max(0, finite(event.energyBefore) - finite(event.energyAfterAction));
    const positionPressure = Math.abs(event.position.x) + Math.abs(event.position.y) + Math.abs(event.position.z);
    return Math.max(1, Math.trunc((hashPressure * 0.55) + (energyDelta * 0.35) + ((positionPressure % 1000) * 0.10)));
  }
}
