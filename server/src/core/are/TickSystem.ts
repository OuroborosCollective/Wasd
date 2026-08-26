/**
 * TickSystem - legacy import surface for ARE tick systems.
 *
 * This file intentionally keeps the compact 10Hz scheduler priority scale used
 * by WorldBrain: GAMEPLAY=20, world-brain=25, BROADCAST=30.
 */

import type { TickId, TickSystemContext as CanonicalTickSystemContext } from './types.js';

export enum TickSystemPriority {
  CRITICAL = 0,
  INFRASTRUCTURE = 10,
  FOUNDATION = 10,
  HIGH = 10,
  WORLD = 15,
  GAMEPLAY = 20,
  NORMAL = 20,
  BROADCAST = 30,
  COMBAT = 30,
  NPC = 30,
  ECONOMY = 30,
  QUEST = 30,
  GUILD = 30,
  PERSISTENCE = 40,
  BACKGROUND = 50,
  LOW = 50,
}

export interface TickSystemContext extends CanonicalTickSystemContext {
  readonly tickCount: TickId;
  readonly isHighFrequencyTick: boolean;
  readonly tickId?: TickId;
  readonly tick?: TickId | number;
  readonly logicalIndex?: TickId | number;
  readonly world?: unknown;
}

export interface TickSystem {
  readonly id?: string;
  readonly name: string;
  readonly priority: TickSystemPriority;
  enabled: boolean;
  tick(context: TickSystemContext): unknown;
  onStart?(): void;
  onEnd?(): void;
  onShutdown?(): void;
  init?(context?: TickSystemContext): void | Promise<void>;
  shutdown?(context?: TickSystemContext): void | Promise<void>;
}

/**
 * Re-executing a live TickSystem after an exception is unsafe by default: a
 * system may have partially mutated authoritative state before throwing. Only
 * systems whose tick body is explicitly proven side-effect-idempotent may opt
 * into a same-context single rerun.
 */
export type TickFailureRerunPolicy = 'never' | 'safe_same_context_once';

export interface TickSystemFailurePolicy {
  readonly rerun: TickFailureRerunPolicy;
}

export interface TickSystemDescriptor {
  system: TickSystem;
  dependencies: string[];
  tags: string[];
  failurePolicy?: TickSystemFailurePolicy;
}

export function createDefaultTickContext(tickCount: number): TickSystemContext {
  return {
    tickCount: tickCount as TickId,
    tickId: tickCount as TickId,
    tick: tickCount,
    logicalIndex: tickCount,
    isHighFrequencyTick: true,
  };
}
