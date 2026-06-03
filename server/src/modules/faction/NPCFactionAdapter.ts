import type { NPC, NPCSystem } from '../npc/NPCSystem.js';

const GRID_SIZE = 64;
const SCALE = 1000;
const FACTION_ADAPTER_HZ = 10;
const REBUILD_EVERY_TICKS = 10;
const DEFAULT_WORLD_SEED = 'areloria:npc-faction-adapter:v1';

type TerrainType = 'mountain' | 'forest' | 'plains' | 'water' | 'desert' | 'swamp';

type TerrainCell = Readonly<{ type: TerrainType; blocked?: boolean }>;

type FactionSource = Readonly<{
  id: string;
  x: number;
  y: number;
  power: number;
  expansionRate: number;
  traits: Record<string, boolean>;
}>;

type InfluenceCell = Readonly<{
  factionId: string | null;
  strength: number;
  contested: boolean;
}>;

export type NPCFactionDecision = Readonly<{
  tick: number;
  npcId: string;
  npcFaction: string;
  tileX: number;
  tileY: number;
  dominantFaction: string | null;
  influenceStrength: number;
  contested: boolean;
  borderPressure: number;
  resourcePressure: number;
  recommendedState: 'defending' | 'warning' | 'harvesting' | 'trading' | 'observing';
  reason: string;
  checksum: string;
}>;

export type NPCFactionAdapterSnapshot = Readonly<{
  tick: number;
  tickHz: number;
  checksum: string;
  factions: readonly FactionSource[];
  decisions: readonly NPCFactionDecision[];
}>;

function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function safeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function intSqrt(value: number): number {
  const n = Math.max(0, Math.trunc(value));
  if (n < 2) return n;
  let x0 = n;
  let x1 = Math.trunc((x0 + Math.trunc(n / x0)) / 2);
  while (x1 < x0) {
    x0 = x1;
    x1 = Math.trunc((x0 + Math.trunc(n / x0)) / 2);
  }
  return x0;
}

function terrainAt(x: number, y: number, worldSeed: string): TerrainCell {
  const h = hashString(`${worldSeed}|terrain|${x}|${y}`);
  const idx = h % 12;
  if (idx === 0) return { type: 'mountain' };
  if (idx <= 2) return { type: 'forest' };
  if (idx === 3) return { type: 'water' };
  if (idx === 4) return { type: 'swamp' };
  if (idx === 5) return { type: 'desert' };
  return { type: 'plains' };
}

function terrainFriction(type: TerrainType): number {
  switch (type) {
    case 'mountain': return 1500;
    case 'forest': return 1200;
    case 'water': return 1100;
    case 'desert': return 1300;
    case 'swamp': return 1600;
    case 'plains':
    default: return 1000;
  }
}

function traitFlagForNpc(npc: NPC): Record<string, boolean> {
  const role = String(npc.role ?? '').toLowerCase();
  const aggression = npc.traits?.aggression ?? 0.5;
  return {
    militarist: aggression >= 0.68 || role.includes('guard') || role.includes('raider'),
    agrarian: role.includes('farmer') || role.includes('worker'),
    magical: role.includes('mage') || role.includes('oracle') || role.includes('shaman'),
    mercantile: role.includes('merchant') || Boolean(npc.shopId),
  };
}

function normalizeFactionId(npc: NPC): string {
  if (npc.faction && String(npc.faction).trim().length > 0) return String(npc.faction);
  if (npc.id.startsWith('wf_')) return 'warfront';
  if (npc.role && String(npc.role).toLowerCase().includes('enemy')) return 'hostile';
  return 'neutral_npc';
}

function worldToTile(value: unknown): number {
  return clamp(Math.round(Number(value ?? 0) / 16) + Math.trunc(GRID_SIZE / 2), 0, GRID_SIZE - 1);
}

function buildFactionSources(npcs: readonly NPC[]): FactionSource[] {
  const grouped = new Map<string, { sx: number; sy: number; power: number; n: number; traits: Record<string, boolean> }>();
  for (const npc of [...npcs].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (npc.state === 'decomposition') continue;
    const factionId = normalizeFactionId(npc);
    const x = worldToTile(npc.position?.x);
    const y = worldToTile(npc.position?.y ?? npc.position?.z);
    const healthFactor = Math.max(1, safeInt(npc.health ?? npc.maxHealth ?? 90, 90));
    const rolePower = String(npc.role ?? '').toLowerCase().includes('guard') ? 4 : 2;
    const power = Math.max(4, Math.trunc(healthFactor / 15) + rolePower);
    const entry = grouped.get(factionId) ?? { sx: 0, sy: 0, power: 0, n: 0, traits: {} };
    entry.sx += x;
    entry.sy += y;
    entry.power += power;
    entry.n += 1;
    const flags = traitFlagForNpc(npc);
    for (const [k, v] of Object.entries(flags)) entry.traits[k] ||= v;
    grouped.set(factionId, entry);
  }

  return [...grouped.entries()].map(([id, g]) => ({
    id,
    x: clamp(Math.trunc(g.sx / Math.max(1, g.n)), 0, GRID_SIZE - 1),
    y: clamp(Math.trunc(g.sy / Math.max(1, g.n)), 0, GRID_SIZE - 1),
    power: clamp(g.power, 1, 80),
    expansionRate: 1.15,
    traits: g.traits,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

function influenceTraitPermille(traits: Record<string, boolean>): number {
  let m = SCALE;
  if (traits.militarist) m = Math.trunc((m * 1075) / SCALE);
  if (traits.magical) m = Math.trunc((m * 1010) / SCALE);
  if (traits.agrarian) m = Math.trunc((m * 1005) / SCALE);
  if (traits.mercantile) m = Math.trunc((m * 1000) / SCALE);
  return m;
}

function calculateInfluenceMap(factions: readonly FactionSource[], worldSeed: string, tick: number): InfluenceCell[][] {
  const map: InfluenceCell[][] = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => ({ factionId: null, strength: 0, contested: false })));
  const second: number[][] = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0));
  const epoch = Math.trunc(tick / (FACTION_ADAPTER_HZ * 10));

  for (const faction of factions) {
    const scaledPower = Math.trunc((faction.power * influenceTraitPermille(faction.traits)) / SCALE);
    const radius = clamp(Math.trunc(scaledPower * faction.expansionRate), 1, 24);
    const radiusSq = radius * radius;
    for (let x = Math.max(0, faction.x - radius); x <= Math.min(GRID_SIZE - 1, faction.x + radius); x++) {
      for (let y = Math.max(0, faction.y - radius); y <= Math.min(GRID_SIZE - 1, faction.y + radius); y++) {
        const dx = faction.x - x;
        const dy = faction.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq > radiusSq) continue;
        const terrain = terrainAt(x, y, worldSeed);
        const dist = intSqrt(distSq);
        const effectiveDistance = Math.trunc((dist * terrainFriction(terrain.type)) / SCALE);
        if (effectiveDistance > radius) continue;
        const falloff = SCALE - Math.trunc((effectiveDistance * SCALE) / radius);
        const jitter = (hashString(`${worldSeed}|${epoch}|${faction.id}|${x}|${y}`) % 29) - 14;
        const strength = Math.max(0, Math.trunc((scaledPower * falloff * (SCALE + jitter)) / (SCALE * SCALE)));
        if (strength <= 0) continue;
        const current = map[x][y];
        if (strength > current.strength || (strength === current.strength && hashString(`${faction.id}|${x}|${y}`) < hashString(`${current.factionId ?? 'neutral'}|${x}|${y}`))) {
          second[x][y] = current.strength;
          map[x][y] = { factionId: faction.id, strength, contested: false };
        } else {
          second[x][y] = Math.max(second[x][y], strength);
        }
      }
    }
  }

  for (let x = 0; x < GRID_SIZE; x++) for (let y = 0; y < GRID_SIZE; y++) {
    const cell = map[x][y];
    if (!cell.factionId) continue;
    map[x][y] = { ...cell, contested: second[x][y] > 0 && cell.strength - second[x][y] <= 3 };
  }
  return map;
}

function borderPressureAt(map: InfluenceCell[][], x: number, y: number, factionId: string | null): number {
  if (!factionId) return 0;
  let pressure = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
    const other = map[nx][ny].factionId;
    if (other && other !== factionId) pressure++;
  }
  return pressure;
}

function chooseRecommendedState(npc: NPC, decision: Omit<NPCFactionDecision, 'recommendedState' | 'reason'>): Pick<NPCFactionDecision, 'recommendedState' | 'reason'> {
  const role = String(npc.role ?? '').toLowerCase();
  if (decision.contested || decision.borderPressure >= 2) return { recommendedState: 'defending', reason: 'contested_faction_frontier' };
  if (decision.dominantFaction && decision.dominantFaction !== decision.npcFaction) return { recommendedState: 'warning', reason: 'foreign_influence_detected' };
  if (decision.resourcePressure >= 0.72) return { recommendedState: 'harvesting', reason: 'faction_resource_pressure' };
  if (role.includes('merchant') || npc.shopId) return { recommendedState: 'trading', reason: 'stable_owned_trade_area' };
  return { recommendedState: 'observing', reason: 'stable_faction_area' };
}

export class NPCFactionAdapter {
  private lastSnapshot: NPCFactionAdapterSnapshot = Object.freeze({ tick: 0, tickHz: FACTION_ADAPTER_HZ, checksum: '0', factions: Object.freeze([]), decisions: Object.freeze([]) });

  public tick(opts: { tickCount: number; npcSystem: NPCSystem; worldSeed?: string }): NPCFactionAdapterSnapshot {
    const tick = Math.max(0, Math.trunc(opts.tickCount));
    if (tick > 0 && tick % REBUILD_EVERY_TICKS !== 0) return this.lastSnapshot;

    const worldSeed = opts.worldSeed ?? DEFAULT_WORLD_SEED;
    const npcs = opts.npcSystem.getAllNPCs().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const factions = buildFactionSources(npcs);
    const influence = calculateInfluenceMap(factions, worldSeed, tick);
    const decisions: NPCFactionDecision[] = [];

    for (const npc of npcs) {
      if (npc.state === 'decomposition') continue;
      const npcFaction = normalizeFactionId(npc);
      const tileX = worldToTile(npc.position?.x);
      const tileY = worldToTile(npc.position?.y ?? npc.position?.z);
      const cell = influence[tileX][tileY];
      const pressure = borderPressureAt(influence, tileX, tileY, cell.factionId);
      const resourcePressure = Math.max(0, Math.min(1, 1 - (cell.strength / 80)));
      const checksum = hashString(`${worldSeed}|${tick}|${npc.id}|${npcFaction}|${tileX}|${tileY}|${cell.factionId ?? 'neutral'}|${cell.strength}|${cell.contested}|${pressure}`).toString(16);
      const base = { tick, npcId: npc.id, npcFaction, tileX, tileY, dominantFaction: cell.factionId, influenceStrength: cell.strength, contested: cell.contested, borderPressure: pressure, resourcePressure, checksum };
      const chosen = chooseRecommendedState(npc, base);
      const decision: NPCFactionDecision = Object.freeze({ ...base, ...chosen });
      decisions.push(decision);
      this.applyDecisionToNpc(npc, decision);
    }

    const checksum = hashString(decisions.map(d => `${d.npcId}:${d.checksum}:${d.recommendedState}`).join('|')).toString(16);
    this.lastSnapshot = Object.freeze({ tick, tickHz: FACTION_ADAPTER_HZ, checksum, factions: Object.freeze(factions), decisions: Object.freeze(decisions) });
    return this.lastSnapshot;
  }

  public getSnapshot(): NPCFactionAdapterSnapshot {
    return this.lastSnapshot;
  }

  private applyDecisionToNpc(npc: NPC, decision: NPCFactionDecision): void {
    npc.memory ??= {};
    npc.memory.factionInfluence = decision;
    npc.activeUtilityDecision = {
      action: `FACTION_${decision.recommendedState.toUpperCase()}`,
      tick: decision.tick,
      reason: decision.reason,
    };

    const lockedStates = new Set(['decomposition', 'interacting', 'withdrawing']);
    if (lockedStates.has(String(npc.state))) return;
    if (npc.targetId) return;

    switch (decision.recommendedState) {
      case 'defending':
        npc.state = 'defending';
        break;
      case 'warning':
        npc.state = 'warning';
        break;
      case 'harvesting':
        npc.state = 'harvesting';
        break;
      case 'trading':
        npc.state = 'observing';
        break;
      case 'observing':
      default:
        if (!npc.state || npc.state === 'wandering') npc.state = 'observing';
        break;
    }
  }
}

export const npcFactionAdapter = new NPCFactionAdapter();
