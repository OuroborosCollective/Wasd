import { AREGuard } from './AREGuard';
import type { IAREPayload } from './AREPayload';
import { assertSafeInteger, type KappaInt } from './Kappa';

export type AREShadowStatus = 'observing' | 'active' | 'saturated';
export type AREShadowEventKind = 'capsule' | 'apex' | 'fusion' | 'scavenger' | 'expired' | 'evicted';

export interface AREShadowStateOptions {
  readonly maxCapsules?: number;
  readonly maxApexNpcs?: number;
  readonly maxEvents?: number;
  readonly ttlTicks?: number;
}

export interface AREShadowEvent {
  readonly tick: number;
  readonly kind: AREShadowEventKind;
  readonly summary: string;
}

export interface AREShadowEcosystemStats {
  readonly capsules: number;
  readonly apexNpcs: number;
  readonly events: readonly string[];
  readonly latestCapsuleTick: number;
  readonly latestFusionTick: number;
  readonly latestScavengerTick: number;
  readonly status: AREShadowStatus;
}

interface ShadowEntry {
  readonly tick: number;
  readonly expiresAtTick: number;
  readonly payload: Readonly<IAREPayload>;
}

const DEFAULT_MAX_CAPSULES = 1000;
const DEFAULT_MAX_APEX = 500;
const DEFAULT_MAX_EVENTS = 50;
const DEFAULT_TTL_TICKS = 72000;

function safePositive(value: number, label: string): number {
  assertSafeInteger(value, label);
  if (value <= 0) throw new Error(`[ARE-ShadowState] ${label} must be greater than zero.`);
  return value;
}

export class AREShadowState {
  private readonly capsules = new Map<string, ShadowEntry>();
  private readonly apexNpcs = new Map<string, ShadowEntry>();
  private readonly events: AREShadowEvent[] = [];
  private latestCapsuleTick = 0;
  private latestFusionTick = 0;
  private latestScavengerTick = 0;

  private readonly maxCapsules: number;
  private readonly maxApexNpcs: number;
  private readonly maxEvents: number;
  private readonly ttlTicks: number;

  constructor(options: AREShadowStateOptions = {}) {
    this.maxCapsules = safePositive(options.maxCapsules ?? DEFAULT_MAX_CAPSULES, 'maxCapsules');
    this.maxApexNpcs = safePositive(options.maxApexNpcs ?? DEFAULT_MAX_APEX, 'maxApexNpcs');
    this.maxEvents = safePositive(options.maxEvents ?? DEFAULT_MAX_EVENTS, 'maxEvents');
    this.ttlTicks = safePositive(options.ttlTicks ?? DEFAULT_TTL_TICKS, 'ttlTicks');
  }

  recordCapsule(tick: number, payload: Readonly<IAREPayload>): void {
    this.assertTick(tick);
    AREGuard.assertNoFloats(payload);
    this.prune(tick);
    this.capsules.set(payload.entityId, Object.freeze({ tick, expiresAtTick: tick + this.ttlTicks, payload }));
    this.latestCapsuleTick = tick;
    this.pushEvent(tick, 'capsule', `capsule:${payload.entityId}`);
    this.enforceCapsuleCap(tick);
  }

  recordApex(tick: number, payload: Readonly<IAREPayload>): void {
    this.assertTick(tick);
    AREGuard.assertNoFloats(payload);
    this.prune(tick);
    this.apexNpcs.set(payload.entityId, Object.freeze({ tick, expiresAtTick: tick + this.ttlTicks, payload }));
    this.pushEvent(tick, 'apex', `apex:${payload.entityId}`);
    this.enforceApexCap(tick);
  }

  recordFusion(tick: number, apex: Readonly<IAREPayload>, consumedEntityIds: readonly string[]): void {
    this.recordApex(tick, apex);
    this.latestFusionTick = tick;
    this.pushEvent(tick, 'fusion', `fusion:${consumedEntityIds.join('+')}=>${apex.entityId}`);
  }

  recordScavenger(tick: number, npcId: string, capsuleId: string, movementCost: KappaInt): void {
    this.assertTick(tick);
    assertSafeInteger(movementCost, 'movementCost');
    this.latestScavengerTick = tick;
    this.pushEvent(tick, 'scavenger', `scavenger:${npcId}->${capsuleId}:${movementCost}`);
  }

  prune(tick: number): void {
    this.assertTick(tick);
    for (const [id, entry] of [...this.capsules.entries()]) {
      if (entry.expiresAtTick <= tick) {
        this.capsules.delete(id);
        this.pushEvent(tick, 'expired', `capsule:${id}`);
      }
    }
    for (const [id, entry] of [...this.apexNpcs.entries()]) {
      if (entry.expiresAtTick <= tick) {
        this.apexNpcs.delete(id);
        this.pushEvent(tick, 'expired', `apex:${id}`);
      }
    }
  }

  getCapsules(): readonly Readonly<IAREPayload>[] {
    return Object.freeze([...this.capsules.values()].map((entry) => entry.payload));
  }

  getApexNpcs(): readonly Readonly<IAREPayload>[] {
    return Object.freeze([...this.apexNpcs.values()].map((entry) => entry.payload));
  }

  getTelemetry(): AREShadowEcosystemStats {
    const saturated = this.capsules.size >= this.maxCapsules || this.apexNpcs.size >= this.maxApexNpcs || this.events.length >= this.maxEvents;
    const active = this.capsules.size > 0 || this.apexNpcs.size > 0 || this.events.length > 0;
    const status: AREShadowStatus = saturated ? 'saturated' : active ? 'active' : 'observing';
    return Object.freeze({
      capsules: this.capsules.size,
      apexNpcs: this.apexNpcs.size,
      events: Object.freeze(this.events.map((event) => `${event.tick}:${event.kind}:${event.summary}`)),
      latestCapsuleTick: this.latestCapsuleTick,
      latestFusionTick: this.latestFusionTick,
      latestScavengerTick: this.latestScavengerTick,
      status,
    });
  }

  private enforceCapsuleCap(tick: number): void {
    while (this.capsules.size > this.maxCapsules) {
      const oldest = this.capsules.keys().next().value as string | undefined;
      if (!oldest) return;
      this.capsules.delete(oldest);
      this.pushEvent(tick, 'evicted', `capsule:${oldest}`);
    }
  }

  private enforceApexCap(tick: number): void {
    while (this.apexNpcs.size > this.maxApexNpcs) {
      const oldest = this.apexNpcs.keys().next().value as string | undefined;
      if (!oldest) return;
      this.apexNpcs.delete(oldest);
      this.pushEvent(tick, 'evicted', `apex:${oldest}`);
    }
  }

  private pushEvent(tick: number, kind: AREShadowEventKind, summary: string): void {
    this.events.push(Object.freeze({ tick, kind, summary }));
    while (this.events.length > this.maxEvents) this.events.shift();
  }

  private assertTick(tick: number): void {
    assertSafeInteger(tick, 'shadow tick');
    if (tick < 0) throw new Error('[ARE-ShadowState] tick must be non-negative.');
  }
}
