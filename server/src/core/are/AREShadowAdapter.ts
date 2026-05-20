import { ARE_CONFIG } from './AREConfig';
import { ARECycle } from './ARECycle';
import { AREGuard } from './AREGuard';
import { AREPayloadFactory, type AREPayloadNormalizationOptions } from './AREPayload';
import type { AREReplayBuffer } from './AREReplayBuffer';

export interface AREShadowTickInput {
  readonly entityId: string;
  readonly position: unknown;
  readonly velocity: unknown;
  readonly tick: number;
  readonly buffer: AREReplayBuffer;
  readonly additionalState?: Record<string, unknown>;
  readonly normalization?: AREPayloadNormalizationOptions;
}

export interface AREShadowTickResult {
  readonly skipped: boolean;
  readonly recorded: boolean;
  readonly stateHash?: number;
  readonly error?: unknown;
}

export class AREShadowAdapter {
  static executeShadowTick(input: AREShadowTickInput): AREShadowTickResult {
    if (!ARE_CONFIG.ENABLE_SHADOW_TICK) {
      return { skipped: true, recorded: false };
    }

    try {
      const entry = AREGuard.executeProtected(() => {
        const genesisPayload = AREPayloadFactory.createNormalized(
          input.entityId,
          input.position as any,
          input.velocity as any,
          input.additionalState ?? {},
          input.normalization ?? {},
        );

        const nextPayload = ARECycle.processCycle(genesisPayload);
        return input.buffer.record(input.tick, nextPayload);
      });

      return { skipped: false, recorded: true, stateHash: entry.stateHash };
    } catch (error) {
      return { skipped: false, recorded: false, error };
    }
  }
}
