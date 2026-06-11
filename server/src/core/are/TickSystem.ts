/**
 * TickSystem - Core Interface for ARE Tick Systems
 *
 * Compatibility wrapper for the canonical contracts in `types.ts`.
 * Keep this file as the legacy import surface while WorldThinShell modules migrate
 * to the unified TickSystemRegistry contract.
 */

import type { TickId, TickSystemContext as CanonicalTickSystemContext } from './types.js';

export enum TickSystemPriority {
  CRITICAL = 0,
  INFRASTRUCTURE = 50,
  FOUNDATION = 100,
  HIGH = 100,
  WORLD = 200,
  GAMEPLAY = 250,
  COMBAT = 300,
  NPC = 400,
  ECONOMY = 500,
  NORMAL = 500,
  QUEST = 600,
  GUILD = 700,
  BROADCAST = 800,
  PERSISTENCE = 850,
  BACKGROUND = 900,
  LOW = 1000,
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
  tick(context: TickSystemContext): void | Promise<void>;
  onStart?(): void;
  onEnd?(): void;
  onShutdown?(): void;
  init?(context?: TickSystemContext): void | Promise<void>;
  shutdown?(context?: TickSystemContext): void | Promise<void>;
}

export interface TickSystemDescriptor {
  system: TickSystem;
  dependencies: string[];
  tags: string[];
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
