import { areTopologyNetwork } from '../../are/ARETopologyNetwork';
import { ARE_CONFIG } from './AREConfig';
import { ARECycle } from './ARECycle';
import { AREDriftEntropy } from './AREDriftEntropy';
import { AREGuard } from './AREGuard';
import { ARENpcEvolution } from './ARENpcEvolution';
import { AREPayloadFactory, type AREPayloadNormalizationOptions, type IAREPayload } from './AREPayload';
import type { AREReplayBuffer } from './AREReplayBuffer';
import { AREShadowLogSink } from './AREShadowLogSink';
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

function whole(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function kappaCellOf(position: unknown): string {
  const pos = position as any;
  const x = Math.round(Number(pos?.x ?? 0) * 1000);
  const y = Math.round(Number(pos?.y ?? 0) * 1000);
  const z = Math.round(Number(pos?.z ?? 0) * 1000);
  return `${x}:${y}:${z}`;
}

export class AREShadowAdapter {
  private static readonly defaultEcosystemState = new AREShadowState();
  private static readonly logSink = new AREShadowLogSink();
  private static lastLoggedTick: number | null = null;
  private static initializationTick: number | null = null;
  private static topologyTick: number | null = null;
  private static topologyCells = new Map<string, string[]>();

  static getLogSink(): AREShadowLogSink {
    return this.logSink;
  }

  static getEcosystemTelemetry(): AREShadowEcosystemStats & { topology: unknown } {
    return {
      ...this.defaultEcosystemState.getTelemetry(),
      topology: areTopologyNetwork.snapshot(this.topologyTick ?? 0),
    };
  }

  private static flushTopologyCells(tick: number): void {
    const cells = [...this.topologyCells.values()];
    for (const ids of cells) {
      const sorted = [...new Set(ids)].sort();
      for (let i = 1; i < sorted.length; i += 1) {
        areTopologyNetwork.observeInteraction(sorted[i - 1], sorted[i], tick);
      }
    }
    this.topologyCells.clear();
  }

  private static observeTopology(entityId: string, position: unknown, tick: number): void {
    const t = whole(tick);
    if (this.topologyTick === null) {
      areTopologyNetwork.seedCore('core:singularity', 0);
      this.topologyTick = t;
      console.log(`[AREShadowAdapter] 🧠 Topology initialisiert bei tick=${t}`);
    }
    if (t !== this.topologyTick) {
      this.flushTopologyCells(this.topologyTick);
      this.topologyTick = t;
    }
    areTopologyNetwork.ensureNode(entityId, t);
    const cell = kappaCellOf(position);
    const bucket = this.topologyCells.get(cell) ?? [];
    bucket.push(entityId);
    this.topologyCells.set(cell, bucket);
  }

  private static writeShadowLog(input: AREShadowTickInput, stateHash: number | undefined): void {
    if (this.lastLoggedTick === input.tick) return;
    this.lastLoggedTick = input.tick;
    
    const stats = {
      capacity: input.buffer.capacity,
      size: input.buffer.size,
      latestTick: input.tick,
      latestEntityId: input.entityId,
      latestStateHash: stateHash ?? null,
      ecosystem: this.getEcosystemTelemetry(),
    };
    
    console.log(`[AREShadowAdapter] 📡 Write shadow log: tick=${input.tick}, entity=${input.entityId}, stateHash=${stateHash}`);
    this.logSink.write(input.tick, stats as any);
  }

  static executeShadowTick(input: AREShadowTickInput): AREShadowTickResult {
    if (!ARE_CONFIG.ENABLE_SHADOW_TICK) {
      return { skipped: true, recorded: false };
    }

    // Initialization guard - MUSS vor dem ersten Tick erfolgen
    if (this.initializationTick === null) {
      this.initializationTick = input.tick;
      console.log(`[AREShadowAdapter] ✅ Adapter initialisiert bei tick=${input.tick}, BufferCap=${input.buffer.capacity}`);
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

        AREShadowAdapter.observeTopology(input.entityId, input.position, input.tick);

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

      AREShadowAdapter.writeShadowLog(input, entry.stateHash);
      return { skipped: false, recorded: true, stateHash: entry.stateHash };
    } catch (error) {
      console.error(`[AREShadowAdapter] ❌ Fehler bei tick=${input.tick}, entity=${input.entityId}:`, error);
      return { skipped: false, recorded: false, error };
    }
  }
}
