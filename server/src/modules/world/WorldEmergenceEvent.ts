export type WorldEmergenceEventType = 'WORLD_EVENT_EMERGENCE_COLLAPSE';

export type KappaCoordinate = {
  x: number;
  y: number;
  z: number;
};

export type WorldEmergenceCollapsePayload = {
  eventType: WorldEmergenceEventType;
  npcId: string;
  factionId: string;
  position: KappaCoordinate;
  tick: number;
  reason: string;
  risk: string;
  kappaHash: string;
  sourceAction: string;
  energyBefore: number;
  energyAfterDecay: number;
  energyAfterAction: number;
};

const KAPPA = 1000;

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function kappaCoordinate(value: unknown): number {
  return Math.trunc(finite(value, 0) * KAPPA);
}

function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function toKappaCoordinate(position: { x?: unknown; y?: unknown; z?: unknown } | null | undefined): KappaCoordinate {
  return Object.freeze({
    x: kappaCoordinate(position?.x),
    y: kappaCoordinate(position?.y),
    z: kappaCoordinate(position?.z),
  });
}

export function createEmergenceCollapsePayload(input: {
  npcId: string;
  factionId?: string | null;
  position: { x?: unknown; y?: unknown; z?: unknown } | null | undefined;
  tick: number;
  reason: string;
  risk: string;
  sourceAction: string;
  energyBefore: number;
  energyAfterDecay: number;
  energyAfterAction: number;
  kappaHash?: string | null;
}): WorldEmergenceCollapsePayload {
  const position = toKappaCoordinate(input.position);
  const tick = Math.max(0, Math.trunc(finite(input.tick, 0)));
  const npcId = String(input.npcId || 'npc:unknown');
  const factionId = String(input.factionId || 'neutral');
  const reason = String(input.reason || 'emergence_collapse');
  const risk = String(input.risk || 'COLLAPSE_IMMINENT');
  const sourceAction = String(input.sourceAction || 'UNKNOWN');
  const energyBefore = Math.max(0, Math.trunc(finite(input.energyBefore, 0)));
  const energyAfterDecay = Math.max(0, Math.trunc(finite(input.energyAfterDecay, 0)));
  const energyAfterAction = Math.max(0, Math.trunc(finite(input.energyAfterAction, 0)));
  const kappaHash = input.kappaHash && String(input.kappaHash).length > 0
    ? String(input.kappaHash)
    : stableHash([
      npcId,
      factionId,
      position.x,
      position.y,
      position.z,
      tick,
      reason,
      risk,
      sourceAction,
      energyBefore,
      energyAfterDecay,
      energyAfterAction,
    ].join('|'));

  return Object.freeze({
    eventType: 'WORLD_EVENT_EMERGENCE_COLLAPSE' as const,
    npcId,
    factionId,
    position,
    tick,
    reason,
    risk,
    kappaHash,
    sourceAction,
    energyBefore,
    energyAfterDecay,
    energyAfterAction,
  });
}
