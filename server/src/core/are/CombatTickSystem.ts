/**
 * CombatTickSystem - deterministic combat processing TickSystem.
 *
 * The tick path is intentionally server-authoritative and input-driven:
 * callers register combat targets, timed effects, and active combat states from
 * validated gameplay events; the 10 Hz tick only advances those explicit inputs.
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { CombatSystem } from '../../modules/combat/CombatSystem.js';
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

export interface CombatTickSnapshot {
  readonly tick: number;
  readonly targetCount: number;
  readonly timedEffectCount: number;
  readonly activeStateCount: number;
  readonly lastAppliedEffectIds: readonly string[];
  readonly lastExpiredStateIds: readonly string[];
}

const COMBAT_STATE_TTL_TICKS = 150;

/**
 * CombatTickSystem implements TickSystem for combat processing.
 */
export class CombatTickSystem implements TickSystem {
  readonly name = 'combat';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;

  private combatSystem: CombatSystem;
  private combatService: CombatService;
  private tickProvider: (() => number) | null = null;
  private readonly targets = new Map<string, CombatMutableTarget>();
  private readonly timedEffects = new Map<string, CombatTimedEffectState>();
  private readonly combatStates = new Map<string, CombatActivityState>();
  private lastSnapshot: CombatTickSnapshot = Object.freeze({
    tick: 0,
    targetCount: 0,
    timedEffectCount: 0,
    activeStateCount: 0,
    lastAppliedEffectIds: Object.freeze([]),
    lastExpiredStateIds: Object.freeze([]),
  });

  constructor(combatSystem: CombatSystem, combatService: CombatService) {
    this.combatSystem = combatSystem;
    this.combatService = combatService;
  }

  /**
   * Set the tick count provider.
   * This allows combat system to get current tick without direct coupling.
   */
  setTickProvider(provider: () => number): void {
    this.tickProvider = provider;
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
    const applied = this.processCombatTimers(tickCount);
    const expired = this.cleanupCombatStates(tickCount);

    this.lastSnapshot = Object.freeze({
      tick: tickCount,
      targetCount: this.targets.size,
      timedEffectCount: this.timedEffects.size,
      activeStateCount: this.combatStates.size,
      lastAppliedEffectIds: Object.freeze(applied),
      lastExpiredStateIds: Object.freeze(expired),
    });
  }

  /**
   * Process deterministic timed combat effects for registered targets.
   */
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

  /**
   * Cleanup expired combat activity states and completed effects.
   */
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

  /**
   * Get the underlying CombatSystem for direct combat operations.
   */
  getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }

  /**
   * Get the underlying CombatService for skill requests.
   */
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

/**
 * Register CombatSystem with the global registry.
 * Call this during server initialization.
 */
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
