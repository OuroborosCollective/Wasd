import { ARE_CONFIG } from './AREConfig';
import { ARECycle } from './ARECycle';
import { AREDriftEntropy } from './AREDriftEntropy';
import { AREGuard } from './AREGuard';
import { ARENpcEvolution } from './ARENpcEvolution';
import { AREPayloadFactory, type AREPayloadNormalizationOptions, type IAREPayload } from './AREPayload';
import type { AREReplayBuffer } from './AREReplayBuffer';
import { AREShadowState, type AREShadowEcosystemStats } from './AREShadowState';

export interface AREShadowTickInput {
  readonly entityId: string;
  readonly position: unknown;
  readonly velocity: unknown;
  readonly tick: number;
  readonly buffer: AREReplayBuffer;
  readonly ecosystemState?: AREShadowState;
  readonly additionalState?: Record<string, unknown>;
  readonly normalization?: AREPayloadNormalizationOptions;
}

export interface AREShadowTickResult {
  readonly skipped: boolean;
  readonly recorded: boolean;
  readonly stateHash?: number;
  readonly error?: unknown;
}

function isNpcEntity(entityId: string): boolean {
  return entityId.startsWith('npc:');
}

function ensureShadowEnergy(payload: Readonly<IAREPayload>): Readonly<IAREPayload> {
  const energy = typeof payload.energy === 'number' ? payload.energy : 1000;
  return AREGuard.protectPayload({ ...payload, energy });
}

export class AREShadowAdapter {
  private static readonly defaultEcosystemState = new AREShadowState();

  static getEcosystemTelemetry(): AREShadowEcosystemStats {
    return this.defaultEcosystemState.getTelemetry();
  }

  static executeShadowTick(input: AREShadowTickInput): AREShadowTickResult {
    if (!ARE_CONFIG.ENABLE_SHADOW_TICK) {
      return { skipped: true, recorded: false };
    }

    try {
      const entry = AREGuard.executeProtected(() => {
        const previousEntries = input.buffer.snapshot();
        const ecosystemState = input.ecosystemState ?? AREShadowAdapter.defaultEcosystemState;
        const genesisPayload = AREPayloadFactory.createNormalized(
          input.entityId,
          input.position as any,
          input.velocity as any,
          input.additionalState ?? {},
          input.normalization ?? {},
        );

        const nextPayload = ARECycle.processCycle(genesisPayload);
        const recorded = input.buffer.record(input.tick, nextPayload);

        if (isNpcEntity(input.entityId)) {
          const ecosystemPayload = ensureShadowEnergy(nextPayload);
          ecosystemState.prune(input.tick);

          const entropy = AREDriftEntropy.applyEntropy(ecosystemPayload);
          if (entropy.capsule) ecosystemState.recordCapsule(input.tick, entropy.capsule);

          for (const candidate of previousEntries) {
            if (candidate.tick !== input.tick) continue;
            if (!isNpcEntity(candidate.entityId)) continue;
            if (candidate.entityId === input.entityId) continue;
            const fusion = ARENpcEvolution.fuseOnSameKappaCell(ecosystemPayload, ensureShadowEnergy(candidate.payload));
            if (fusion.fused && fusion.apex) ecosystemState.recordFusion(input.tick, fusion.apex, fusion.consumedEntityIds);
          }

          const scan = ARENpcEvolution.scanOwnChunkForCapsule(ecosystemPayload, ecosystemState.getCapsules());
          if (scan.capsule) ecosystemState.recordScavenger(input.tick, input.entityId, scan.capsule.entityId, scan.movementCost);
        }

        return recorded;
      });

      return { skipped: false, recorded: true, stateHash: entry.stateHash };
    } catch (error) {
      return { skipped: false, recorded: false, error };
    }
  }
}
