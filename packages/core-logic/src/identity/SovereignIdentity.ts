export type CollectiveRole = 'Scavenger' | 'Trader' | 'Guardian' | 'Oracle' | 'Builder' | 'Warden';

export interface CollectiveGateInput {
  handle: string;
  worldSeed?: string;
  tick: number;
  kappa?: number;
}

export interface CollectiveIdentity {
  handle: string;
  publicKey: string;
  role: CollectiveRole;
  deterministicSeed: string;
  tick: number;
  kappa: 1000;
  spawn: {
    chunkX: number;
    chunkY: number;
    x: number;
    y: number;
  };
  starterLoadout: string[];
  identityHash: string;
}

const ROLES: CollectiveRole[] = ['Scavenger', 'Trader', 'Guardian', 'Oracle', 'Builder', 'Warden'];
const LOADOUTS: Record<CollectiveRole, string[]> = {
  Scavenger: ['rusted_blade', 'scrap_satchel', 'echo_ration'],
  Trader: ['ledger_tablet', 'trade_token', 'travel_cloak'],
  Guardian: ['training_spear', 'ward_shield', 'iron_ration'],
  Oracle: ['signal_lens', 'echo_charm', 'night_ink'],
  Builder: ['layout_compass', 'stone_marker', 'road_string'],
  Warden: ['sentinel_key', 'ward_torch', 'civic_badge'],
};

export function stableIdentityHash(parts: Array<string | number | boolean | null | undefined>): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const payload = parts.map((part) => String(part ?? '')).join('|');
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const a = h1.toString(16).padStart(8, '0');
  const b = h2.toString(16).padStart(8, '0');
  return `${a}${b}${b}${a}${a}${b}${b}${a}`.slice(0, 64);
}

function hashInt(hash: string, offset: number, modulo: number): number {
  const value = Number.parseInt(hash.slice(offset, offset + 8).padEnd(8, '0'), 16);
  return modulo <= 0 ? value : value % modulo;
}

export function normalizeCollectiveHandle(handle: string): string {
  return (handle || 'architect').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 48) || 'architect';
}

export function deriveCollectiveIdentity(input: CollectiveGateInput): CollectiveIdentity {
  const handle = normalizeCollectiveHandle(input.handle);
  const kappa = input.kappa ?? 1000;
  if (kappa !== 1000) throw new Error(`Collective identity requires kappa === 1000, got ${kappa}`);

  const tick = Math.max(0, Math.trunc(input.tick));
  const worldSeed = input.worldSeed ?? 'ARELORIA|COLLECTIVE|ALPHA';
  const tickPhase10Hz = tick % 10;
  const identityHash = stableIdentityHash(['ARE_COLLECTIVE_GATE', worldSeed, handle, tick, tickPhase10Hz, kappa]);
  const role = ROLES[hashInt(identityHash, 0, ROLES.length)];
  const chunkX = hashInt(identityHash, 8, 32) - 16;
  const chunkY = hashInt(identityHash, 16, 32) - 16;
  const x = hashInt(identityHash, 24, 64);
  const y = hashInt(identityHash, 32, 64);
  const publicKey = `are-${identityHash.slice(0, 8)}-${identityHash.slice(8, 16)}-${tickPhase10Hz}`;
  const deterministicSeed = stableIdentityHash(['ARE_IDENTITY_SEED', identityHash, role, chunkX, chunkY]);

  return {
    handle,
    publicKey,
    role,
    deterministicSeed,
    tick,
    kappa: 1000,
    spawn: { chunkX, chunkY, x, y },
    starterLoadout: LOADOUTS[role],
    identityHash,
  };
}
