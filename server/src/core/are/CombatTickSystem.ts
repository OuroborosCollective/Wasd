/**
 * CombatTickSystem - deterministic combat processing TickSystem.
 *
 * Validated attack intents are queued outside the simulation and resolved only
 * inside the authoritative 10-Hz tick against live player/NPC providers.
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { CombatSystem, type CombatResult } from '../../modules/combat/CombatSystem.js';
import { CombatService } from '../../modules/combat/CombatService.js';

export interface CombatMutableTarget {
  readonly id: string;
  health: number;
  maxHealth?: number;
}

export interface CombatTimedEffectInput {
  readonly effectId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly kind: 'bleed' | 'burn' | 'poison' | 'regen' | 'shield_decay';
  readonly damagePerTick?: number;
  readonly healPerTick?: number;
  readonly startTick: number;
  readonly intervalTicks: number;
  readonly durationTicks: number;
}

export interface CombatTimedEffectState extends CombatTimedEffectInput {
  nextTick: number;
  expiresAtTick: number;
  appliedTicks: number;
}

export interface CombatActivityState {
  readonly entityId: string;
  readonly openedAtTick: number;
  lastActiveTick: number;
  expiresAtTick: number;
  readonly source: 'attack' | 'skill' | 'timed_effect' | 'external';
}

export interface CanonicalCombatAttackIntent {
  readonly intentHash: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly acceptedAtTick: number;
  readonly maxRange: number;
}

export interface CombatAttackReceipt {
  readonly intentHash: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly acceptedAtTick: number;
  readonly executionTick: number;
  readonly applied: boolean;
  readonly reason: string | null;
  readonly distance: number | null;
  readonly before: Readonly<{
    attackerStamina: number | null;
    targetHealth: number | null;
  }>;
  readonly after: Readonly<{
    attackerStamina: number | null;
    targetHealth: number | null;
  }>;
  readonly result: CombatResult | null;
}

export interface CombatTickSnapshot {
  readonly tick: number;
  readonly targetCount: number;
  readonly timedEffectCount: number;
  readonly activeStateCount: number;
  readonly queuedAttackCount: number;
  readonly lastProcessedAttackIntentHashes: readonly string[];
  readonly lastAppliedEffectIds: readonly string[];
  readonly lastExpiredStateIds: readonly string[];
}

const COMBAT_STATE_TTL_TICKS = 150;
const ATTACK_RECEIPT_TTL_TICKS = 600;
const MAX_ATTACK_QUEUE = 2048;

function finitePosition(entity: any): { x: number; y: number } | null {
  const x = Number(entity?.position?.x);
  const y = Number(entity?.position?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function stableAttackSort(a: CanonicalCombatAttackIntent, b: CanonicalCombatAttackIntent): number {
  return (
    a.acceptedAtTick - b.acceptedAtTick ||
    a.attackerId.localeCompare(b.attackerId) ||
    a.targetId.localeCompare(b.targetId) ||
    a.intentHash.localeCompare(b.intentHash)
  );
}

/**
 * CombatTickSystem implements TickSystem for combat processing.
 */
export class CombatTickSystem implements TickSystem {
  readonly name = 'combat';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;

  private tickProvider: (() => number) | null = null;
  private playerProvider: ((playerId: string) => any | null | undefined) | null = null;
  private npcProvider: ((npcId: string) => any | null | undefined) | null = null;
  private readonly targets = new Map<string, CombatMutableTarget>();
  private readonly timedEffects = new Map<string, CombatTimedEffectState>();
  private readonly combatStates = new Map<string, CombatActivityState>();
  private readonly attackQueue: CanonicalCombatAttackIntent[] = [];
  private readonly attackReceipts = new Map<string, CombatAttackReceipt>();
  private lastSnapshot: CombatTickSnapshot = Object.freeze({
    tick: 0,
    targetCount: 0,
    timedEffectCount: 0,
    activeStateCount: 0,
    queuedAttackCount: 0,
    lastProcessedAttackIntentHashes: Object.freeze([]),
    lastAppliedEffectIds: Object.freeze([]),
    lastExpiredStateIds: Object.freeze([]),
  });

  constructor(
    private readonly combatSystem: CombatSystem,
    private readonly combatService: CombatService,
  ) {}

  setTickProvider(provider: () => number): void {
    this.tickProvider = provider;
  }

  setPlayerProvider(provider: (playerId: string) => any | null | undefined): void {
    this.playerProvider = provider;
  }

  setNpcProvider(provider: (npcId: string) => any | null | undefined): void {
    this.npcProvider = provider;
  }

  /**
   * Queue one canonical attack for the deterministic tick. The hash is the
   * idempotency key: the same intent cannot be queued or executed twice.
   */
  enqueueAttack(intent: CanonicalCombatAttackIntent): boolean {
    if (!/^[a-f0-9]{64}$/i.test(intent.intentHash)) return false;
    if (!intent.attackerId || !intent.targetId) return false;
    if (!Number.isSafeInteger(intent.acceptedAtTick) || intent.acceptedAtTick < 0) return false;
    if (!Number.isFinite(intent.maxRange) || intent.maxRange <= 0) return false;
    if (this.attackReceipts.has(intent.intentHash)) return false;
    if (this.attackQueue.some((queued) => queued.intentHash === intent.intentHash)) return false;
    if (this.attackQueue.length >= MAX_ATTACK_QUEUE) return false;

    this.attackQueue.push(Object.freeze({
      intentHash: intent.intentHash.toLowerCase(),
      attackerId: String(intent.attackerId),
      targetId: String(intent.targetId),
      acceptedAtTick: Math.trunc(intent.acceptedAtTick),
      maxRange: Number(intent.maxRange),
    }));
    return true;
  }

  getAttackReceipt(intentHash: string): CombatAttackReceipt | null {
    return this.attackReceipts.get(String(intentHash).toLowerCase()) ?? null;
  }

  getPendingAttackCount(): number {
    return this.attackQueue.length;
  }

  /** Register or refresh a mutable combat target from validated runtime state. */
  registerCombatTarget(target: CombatMutableTarget): void {
    if (!target.id || !Number.isFinite(target.health)) return;
    this.targets.set(target.id, target);
  }

  unregisterCombatTarget(targetId: string): void {
    this.targets.delete(targetId);
  }

  /** Queue a deterministic damage/heal-over-time effect. */
  queueTimedEffect(input: CombatTimedEffectInput): boolean {
    if (!input.effectId || !input.targetId || input.durationTicks <= 0 || input.intervalTicks <= 0) return false;
    const damagePerTick = Math.max(0, Math.floor(Number(input.damagePerTick ?? 0)));
    const healPerTick = Math.max(0, Math.floor(Number(input.healPerTick ?? 0)));
    if (damagePerTick === 0 && healPerTick === 0) return false;

    this.timedEffects.set(input.effectId, {
      ...input,
      damagePerTick,
      healPerTick,
      startTick: Math.max(0, Math.floor(input.startTick)),
      intervalTicks: Math.max(1, Math.floor(input.intervalTicks)),
      durationTicks: Math.max(1, Math.floor(input.durationTicks)),
      nextTick: Math.max(0, Math.floor(input.startTick)),
      expiresAtTick: Math.max(0, Math.floor(input.startTick)) + Math.max(1, Math.floor(input.durationTicks)),
      appliedTicks: 0,
    });
    this.touchCombatState(input.targetId, input.startTick, 'timed_effect');
    return true;
  }

  /** Mark an entity as combat-active using an explicit tick. */
  touchCombatState(entityId: string, tickCount = this.resolveTickCount(), source: CombatActivityState['source'] = 'external'): void {
    if (!entityId) return;
    const safeTick = Math.max(0, Math.floor(tickCount));
    const existing = this.combatStates.get(entityId);
    if (existing) {
      existing.lastActiveTick = safeTick;
      existing.expiresAtTick = safeTick + COMBAT_STATE_TTL_TICKS;
      return;
    }
    this.combatStates.set(entityId, {
      entityId,
      openedAtTick: safeTick,
      lastActiveTick: safeTick,
      expiresAtTick: safeTick + COMBAT_STATE_TTL_TICKS,
      source,
    });
  }

  tick(context: TickSystemContext): void {
    const tickCount = context.tickCount;
    const processedAttacks = this.processAttackQueue(tickCount);
    const applied = this.processCombatTimers(tickCount);
    const expired = this.cleanupCombatStates(tickCount);
    this.pruneAttackReceipts(tickCount);

    this.lastSnapshot = Object.freeze({
      tick: tickCount,
      targetCount: this.targets.size,
      timedEffectCount: this.timedEffects.size,
      activeStateCount: this.combatStates.size,
      queuedAttackCount: this.attackQueue.length,
      lastProcessedAttackIntentHashes: Object.freeze(processedAttacks),
      lastAppliedEffectIds: Object.freeze(applied),
      lastExpiredStateIds: Object.freeze(expired),
    });
  }

  private processAttackQueue(tickCount: number): string[] {
    if (this.attackQueue.length === 0) return [];
    const ready: CanonicalCombatAttackIntent[] = [];
    const deferred: CanonicalCombatAttackIntent[] = [];
    for (const intent of this.attackQueue.splice(0, this.attackQueue.length)) {
      if (intent.acceptedAtTick <= tickCount) ready.push(intent);
      else deferred.push(intent);
    }
    ready.sort(stableAttackSort);
    deferred.sort(stableAttackSort);
    this.attackQueue.push(...deferred);

    const processed: string[] = [];
    for (const intent of ready) {
      const attacker = this.playerProvider?.(intent.attackerId) ?? null;
      const target = this.npcProvider?.(intent.targetId) ?? null;
      const attackerPos = finitePosition(attacker);
      const targetPos = finitePosition(target);
      const before = Object.freeze({
        attackerStamina: Number.isFinite(Number(attacker?.stamina)) ? Number(attacker.stamina) : null,
        targetHealth: Number.isFinite(Number(target?.health)) ? Number(target.health) : null,
      });

      let receipt: CombatAttackReceipt;
      if (!attacker) {
        receipt = this.createRejectedAttackReceipt(intent, tickCount, before, 'attacker_missing');
      } else if (!target) {
        receipt = this.createRejectedAttackReceipt(intent, tickCount, before, 'target_missing');
      } else if (!attackerPos || !targetPos) {
        receipt = this.createRejectedAttackReceipt(intent, tickCount, before, 'position_unavailable');
      } else if (!Number.isFinite(Number(target.health)) || Number(target.health) <= 0) {
        receipt = this.createRejectedAttackReceipt(intent, tickCount, before, 'target_not_alive');
      } else {
        const dx = attackerPos.x - targetPos.x;
        const dy = attackerPos.y - targetPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > intent.maxRange) {
          receipt = this.createRejectedAttackReceipt(intent, tickCount, before, 'target_out_of_range', distance);
        } else {
          const result = this.combatSystem.attack(attacker, target);
          this.touchCombatState(intent.attackerId, tickCount, 'attack');
          this.touchCombatState(intent.targetId, tickCount, 'attack');
          receipt = Object.freeze({
            intentHash: intent.intentHash,
            attackerId: intent.attackerId,
            targetId: intent.targetId,
            acceptedAtTick: intent.acceptedAtTick,
            executionTick: tickCount,
            applied: result.success === true,
            reason: result.success === true ? null : result.reason ?? 'combat_rejected',
            distance,
            before,
            after: Object.freeze({
              attackerStamina: Number.isFinite(Number(attacker?.stamina)) ? Number(attacker.stamina) : null,
              targetHealth: Number.isFinite(Number(target?.health)) ? Number(target.health) : null,
            }),
            result: Object.freeze({ ...result }),
          });
        }
      }

      this.attackReceipts.set(intent.intentHash, receipt);
      processed.push(intent.intentHash);
    }
    return processed;
  }

  private createRejectedAttackReceipt(
    intent: CanonicalCombatAttackIntent,
    tickCount: number,
    before: CombatAttackReceipt['before'],
    reason: string,
    distance: number | null = null,
  ): CombatAttackReceipt {
    return Object.freeze({
      intentHash: intent.intentHash,
      attackerId: intent.attackerId,
      targetId: intent.targetId,
      acceptedAtTick: intent.acceptedAtTick,
      executionTick: tickCount,
      applied: false,
      reason,
      distance,
      before,
      after: before,
      result: null,
    });
  }

  private pruneAttackReceipts(tickCount: number): void {
    for (const [intentHash, receipt] of this.attackReceipts) {
      if (tickCount - receipt.executionTick > ATTACK_RECEIPT_TTL_TICKS) {
        this.attackReceipts.delete(intentHash);
      }
    }
  }

  /** Process deterministic timed combat effects for registered targets. */
  private processCombatTimers(tickCount: number): readonly string[] {
    const safeTick = Math.max(0, Math.floor(tickCount));
    const appliedEffectIds: string[] = [];
    const effects = [...this.timedEffects.values()].sort((a, b) => a.effectId.localeCompare(b.effectId));

    for (const effect of effects) {
      if (safeTick < effect.nextTick) continue;
      if (safeTick >= effect.expiresAtTick) {
        this.timedEffects.delete(effect.effectId);
        continue;
      }

      const target = this.targets.get(effect.targetId);
      if (!target) {
        effect.nextTick += effect.intervalTicks;
        continue;
      }

      const damage = Math.max(0, Math.floor(effect.damagePerTick ?? 0));
      const healing = Math.max(0, Math.floor(effect.healPerTick ?? 0));
      const maxHealth = Math.max(0, Math.floor(target.maxHealth ?? target.health + healing));
      const nextHealth = Math.max(0, Math.min(maxHealth, Math.floor(target.health) - damage + healing));
      target.health = nextHealth;
      effect.appliedTicks += 1;
      effect.nextTick += effect.intervalTicks;
      appliedEffectIds.push(effect.effectId);
      this.touchCombatState(effect.targetId, safeTick, 'timed_effect');

      if (nextHealth <= 0 || effect.nextTick >= effect.expiresAtTick) {
        this.timedEffects.delete(effect.effectId);
      }
    }

    return Object.freeze(appliedEffectIds);
  }

  private cleanupCombatStates(tickCount: number): readonly string[] {
    const safeTick = Math.max(0, Math.floor(tickCount));
    const expiredStateIds: string[] = [];

    for (const [entityId, state] of [...this.combatStates.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (safeTick >= state.expiresAtTick) {
        this.combatStates.delete(entityId);
        expiredStateIds.push(entityId);
      }
    }

    for (const [effectId, effect] of [...this.timedEffects.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (safeTick >= effect.expiresAtTick) {
        this.timedEffects.delete(effectId);
      }
    }

    return Object.freeze(expiredStateIds);
  }

  getLastTickSnapshot(): CombatTickSnapshot {
    return this.lastSnapshot;
  }

  getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }

  getCombatService(): CombatService {
    return this.combatService;
  }

  onStart(): void {
    console.log('[CombatTickSystem] Started - combat processing active');
  }

  private resolveTickCount(): number {
    return Math.max(0, Math.floor(this.tickProvider?.() ?? 0));
  }
}

export function registerCombatSystem(
  combatSystem: CombatSystem,
  combatService: CombatService
): CombatTickSystem {
  const system = new CombatTickSystem(combatSystem, combatService);

  tickSystemRegistry.register({
    system,
    dependencies: ['player-system', 'npc-system'],
    tags: ['combat', 'damage', 'gameplay'],
  });

  return system;
}
