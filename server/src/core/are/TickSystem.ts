/**
 * TickSystem - legacy import surface for ARE tick systems.
 *
 * This file reuses the canonical priority enum from `types.ts` so registry,
 * auto-generated systems and WorldThinShell systems all share one priority type.
 */

import { TickSystemPriority } from './types.js';
import type { TickId, TickSystemContext as CanonicalTickSystemContext } from './types.js';

export { TickSystemPriority };

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
