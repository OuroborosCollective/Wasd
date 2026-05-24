export const KAPPA = 1000 as const;
export const PHI_ARE = 1000 as const;
export const E_MAX = 9999 as const;
export const C_DECAY = 5 as const;
export const DEFAULT_BASE_ENTROPY = 0 as const;
export const DEFAULT_PLEXITY = 1000 as const;
export const INTERACTION_DECAY_WINDOW_TICKS = 600 as const;

export type AREEntityKind = 'player' | 'npc' | 'loot' | 'monster' | 'world_object' | 'temporary' | 'unknown';

export interface KappaCoordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AREEntity {
  readonly id: string;
  readonly kind?: AREEntityKind | string;
  readonly kappa: KappaCoordinate;
  readonly baseEntropy?: number;
  readonly lastInteractionTick?: number;
  readonly plexity?: number;
  readonly active?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface PruningMetrics {
  readonly entityId: string;
  readonly tick: number;
  readonly effectiveEntropy: number;
  readonly temperature: number;
  readonly higgsMass: number;
  readonly previousPlexity: number;
  readonly nextPlexity: number;
  readonly decayed: boolean;
}

export interface ElectroweakDecayShard {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly kind: 'are_raw_material_shard';
  readonly kappa: KappaCoordinate;
  readonly amount: number;
  readonly createdAtTick: number;
  readonly higgsMass: number;
}

export interface ElectroweakDecayEvent {
  readonly type: 'ARE_ELECTROWEAK_DECAY';
  readonly tick: number;
  readonly entity: Readonly<AREEntity>;
  readonly metrics: PruningMetrics;
  readonly shards: readonly ElectroweakDecayShard[];
}

export interface PruningUpdateResult {
  readonly entity: AREEntity | null;
  readonly metrics: PruningMetrics;
  readonly decayEvent: ElectroweakDecayEvent | null;
}

export interface PruningManagerStats {
  readonly trackedEntities: number;
  readonly decayedEntities: number;
  readonly lastTick: number;
  readonly lastDecayEntityId: string | null;
}

function assertInteger(name: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new Error(`AREElectroweakPruning integer invariant failed: ${name}=${value}`);
  }
}

function clampInt(value: number, min: number, max: number): number {
  assertInteger('clamp.value', value);
  assertInteger('clamp.min', min);
  assertInteger('clamp.max', max);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function whole(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function normalizeTick(tick: number): number {
  return clampInt(whole(tick), 0, Number.MAX_SAFE_INTEGER);
}

function normalizeCoordinate(coord: KappaCoordinate): KappaCoordinate {
  const normalized = Object.freeze({
    x: whole(coord.x),
    y: whole(coord.y),
    z: whole(coord.z),
  });
  assertNoFloats(normalized);
  return normalized;
}

export function assertNoFloats(value: unknown, path = 'value'): void {
  if (typeof value === 'number') {
    assertInteger(path, value);
    return;
  }
  if (value === null || value === undefined) return;
  if (typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertNoFloats(child, `${path}.${key}`);
  }
}

export function calculateEffectiveEntropy(entity: AREEntity, currentTick: number): number {
  const tick = normalizeTick(currentTick);
  const lastInteractionTick = clampInt(whole(entity.lastInteractionTick ?? tick), 0, tick);
  const baseEntropy = clampInt(whole(entity.baseEntropy ?? DEFAULT_BASE_ENTROPY), 0, E_MAX);
  const isolationWindows = Math.trunc((tick - lastInteractionTick) / INTERACTION_DECAY_WINDOW_TICKS);
  return clampInt(baseEntropy + isolationWindows, 0, E_MAX);
}

export function calculateTemperature(effectiveEntropy: number): number {
  const e = clampInt(whole(effectiveEntropy), 0, E_MAX);
  return Math.trunc(KAPPA / (e + 1));
}

export function calculateHiggsMass(temperature: number): number {
  const t = clampInt(whole(temperature), 0, KAPPA);
  return Math.trunc((PHI_ARE * (KAPPA - t)) / KAPPA);
}

export function calculateNextPlexity(previousPlexity: number, higgsMass: number): number {
  const p = whole(previousPlexity, DEFAULT_PLEXITY);
  const h = clampInt(whole(higgsMass), 0, PHI_ARE);
  return p - h * C_DECAY;
}

export function buildDecayShard(entity: AREEntity, metrics: PruningMetrics): ElectroweakDecayShard {
  const shard: ElectroweakDecayShard = Object.freeze({
    id: `are_shard_${entity.id}_${metrics.tick}_${metrics.higgsMass}`,
    sourceEntityId: entity.id,
    kind: 'are_raw_material_shard',
    kappa: normalizeCoordinate(entity.kappa),
    amount: Math.max(1, Math.trunc(metrics.higgsMass / C_DECAY)),
    createdAtTick: metrics.tick,
    higgsMass: metrics.higgsMass,
  });
  assertNoFloats(shard);
  return shard;
}

export function onElectroweakDecay(entity: AREEntity, metrics: PruningMetrics): ElectroweakDecayEvent {
  const frozenEntity = Object.freeze({
    ...entity,
    kappa: normalizeCoordinate(entity.kappa),
    active: false,
    plexity: metrics.nextPlexity,
  });
  const event: ElectroweakDecayEvent = Object.freeze({
    type: 'ARE_ELECTROWEAK_DECAY',
    tick: metrics.tick,
    entity: frozenEntity,
    metrics,
    shards: Object.freeze([buildDecayShard(frozenEntity, metrics)]),
  });
  assertNoFloats(event);
  return event;
}

export class AREElectroweakPruningManager {
  private readonly entities = new Map<string, AREEntity>();
  private readonly decayEvents: ElectroweakDecayEvent[] = [];
  private lastTick = 0;

  public track(entity: AREEntity, currentTick = this.lastTick): AREEntity {
    const tick = normalizeTick(currentTick);
    const normalized: AREEntity = Object.freeze({
      ...entity,
      kappa: normalizeCoordinate(entity.kappa),
      baseEntropy: clampInt(whole(entity.baseEntropy ?? DEFAULT_BASE_ENTROPY), 0, E_MAX),
      lastInteractionTick: clampInt(whole(entity.lastInteractionTick ?? tick), 0, tick),
      plexity: whole(entity.plexity ?? DEFAULT_PLEXITY),
      active: entity.active ?? true,
    });
    assertNoFloats(normalized);
    this.entities.set(normalized.id, normalized);
    return normalized;
  }

  public observeInteraction(entityId: string, currentTick: number): AREEntity | null {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    const tick = normalizeTick(currentTick);
    return this.track({ ...entity, lastInteractionTick: tick, baseEntropy: DEFAULT_BASE_ENTROPY, active: true }, tick);
  }

  public updateEntity(entity: AREEntity, currentTick: number): PruningUpdateResult {
    const tracked = this.entities.get(entity.id) ?? this.track(entity, currentTick);
    const tick = normalizeTick(currentTick);
    const effectiveEntropy = calculateEffectiveEntropy(tracked, tick);
    const temperature = calculateTemperature(effectiveEntropy);
    const higgsMass = calculateHiggsMass(temperature);
    const previousPlexity = whole(tracked.plexity ?? DEFAULT_PLEXITY);
    const nextPlexity = higgsMass > 0 ? calculateNextPlexity(previousPlexity, higgsMass) : previousPlexity;
    const metrics: PruningMetrics = Object.freeze({
      entityId: tracked.id,
      tick,
      effectiveEntropy,
      temperature,
      higgsMass,
      previousPlexity,
      nextPlexity,
      decayed: nextPlexity <= 0,
    });
    assertNoFloats(metrics);

    if (metrics.decayed) {
      const decayEvent = onElectroweakDecay(tracked, metrics);
      this.entities.delete(tracked.id);
      this.decayEvents.push(decayEvent);
      return Object.freeze({ entity: null, metrics, decayEvent });
    }

    const nextEntity: AREEntity = Object.freeze({ ...tracked, plexity: nextPlexity, active: true });
    assertNoFloats(nextEntity);
    this.entities.set(nextEntity.id, nextEntity);
    return Object.freeze({ entity: nextEntity, metrics, decayEvent: null });
  }

  public tick(currentTick: number, entities: readonly AREEntity[]): readonly PruningUpdateResult[] {
    this.lastTick = normalizeTick(currentTick);
    const results = entities.map((entity) => this.updateEntity(entity, this.lastTick));
    assertNoFloats(results);
    return Object.freeze(results);
  }

  public flushDecayEvents(): readonly ElectroweakDecayEvent[] {
    const events = Object.freeze([...this.decayEvents]);
    this.decayEvents.length = 0;
    return events;
  }

  public getStats(): PruningManagerStats {
    return Object.freeze({
      trackedEntities: this.entities.size,
      decayedEntities: this.decayEvents.length,
      lastTick: this.lastTick,
      lastDecayEntityId: this.decayEvents.at(-1)?.entity.id ?? null,
    });
  }
}
