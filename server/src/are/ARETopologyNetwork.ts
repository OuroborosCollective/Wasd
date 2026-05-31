export type ARETopologyNode = {
  entityId: string;
  baseDistance: number;
  lastInteractionTick: number;
  omega: number;
};

export type ARETopologySnapshot = {
  tick: number;
  nodeCount: number;
  coreCount: number;
  maxEffectiveDistance: number;
  minOmega: number;
  pruneCandidates: string[];
  nodes: ARETopologyNode[];
};

export type ARETopologyOptions = {
  kappa?: number;
  maxDistance?: number;
  isolationIntervalTicks?: number;
  pruneThreshold?: number;
};

const DEFAULT_KAPPA = 1000;
const DEFAULT_MAX_DISTANCE = 9999;
const DEFAULT_ISOLATION_INTERVAL_TICKS = 600;
const DEFAULT_PRUNE_THRESHOLD = 9500;

function whole(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class ARETopologyNetwork {
  private readonly kappa: number;
  private readonly maxDistance: number;
  private readonly isolationIntervalTicks: number;
  private readonly pruneThreshold: number;
  private readonly nodes = new Map<string, { baseDistance: number; lastInteractionTick: number }>();

  constructor(options: ARETopologyOptions = {}) {
    this.kappa = whole(options.kappa, DEFAULT_KAPPA);
    this.maxDistance = whole(options.maxDistance, DEFAULT_MAX_DISTANCE);
    this.isolationIntervalTicks = Math.max(1, whole(options.isolationIntervalTicks, DEFAULT_ISOLATION_INTERVAL_TICKS));
    this.pruneThreshold = whole(options.pruneThreshold, DEFAULT_PRUNE_THRESHOLD);
  }

  seedCore(entityId: string, tick: number): void {
    if (!entityId) return;
    this.nodes.set(entityId, { baseDistance: 0, lastInteractionTick: whole(tick) });
  }

  ensureNode(entityId: string, tick: number, fallbackDistance = this.maxDistance): void {
    if (!entityId || this.nodes.has(entityId)) return;
    this.nodes.set(entityId, {
      baseDistance: clamp(whole(fallbackDistance, this.maxDistance), 0, this.maxDistance),
      lastInteractionTick: whole(tick),
    });
  }

  observeInteraction(aId: string, bId: string, tick: number): void {
    if (!aId || !bId || aId === bId) return;
    const t = whole(tick);
    this.ensureNode(aId, t);
    this.ensureNode(bId, t);
    const a = this.nodes.get(aId)!;
    const b = this.nodes.get(bId)!;
    const nextA = Math.min(a.baseDistance, b.baseDistance + 1, this.maxDistance);
    const nextB = Math.min(b.baseDistance, a.baseDistance + 1, this.maxDistance);
    this.nodes.set(aId, { baseDistance: nextA, lastInteractionTick: t });
    this.nodes.set(bId, { baseDistance: nextB, lastInteractionTick: t });
  }

  getBaseDistance(entityId: string): number {
    return this.nodes.get(entityId)?.baseDistance ?? this.maxDistance;
  }

  getEffectiveDistance(entityId: string, tick: number): number {
    const node = this.nodes.get(entityId);
    if (!node) return this.maxDistance;
    const ageTicks = Math.max(0, whole(tick) - node.lastInteractionTick);
    const isolationAge = Math.floor(ageTicks / this.isolationIntervalTicks);
    return clamp(node.baseDistance + isolationAge, 0, this.maxDistance);
  }

  getOmega(entityId: string, tick: number): number {
    const effectiveDistance = this.getEffectiveDistance(entityId, tick);
    return Math.floor(this.kappa / (effectiveDistance + 1));
  }

  shouldPrune(entityId: string, tick: number): boolean {
    return this.getEffectiveDistance(entityId, tick) >= this.pruneThreshold;
  }

  /**
   * Resets the network by clearing all nodes.
   */
  clear(): void {
    this.nodes.clear();
  }

  snapshot(tick: number, limit = 64): ARETopologySnapshot {
    const t = whole(tick);
    const ids = [...this.nodes.keys()].sort();
    const nodes = ids.slice(0, Math.max(0, whole(limit, 64))).map((entityId) => ({
      entityId,
      baseDistance: this.getBaseDistance(entityId),
      lastInteractionTick: this.nodes.get(entityId)?.lastInteractionTick ?? 0,
      omega: this.getOmega(entityId, t),
    }));
    const allEffective = ids.map((id) => this.getEffectiveDistance(id, t));
    const allOmega = ids.map((id) => this.getOmega(id, t));
    return {
      tick: t,
      nodeCount: ids.length,
      coreCount: ids.filter((id) => this.getBaseDistance(id) === 0).length,
      maxEffectiveDistance: allEffective.length ? Math.max(...allEffective) : 0,
      minOmega: allOmega.length ? Math.min(...allOmega) : this.kappa,
      pruneCandidates: ids.filter((id) => this.shouldPrune(id, t)).slice(0, 32),
      nodes,
    };
  }
}

export const areTopologyNetwork = new ARETopologyNetwork();
