import { WatchdogCascadeMonitor } from './watchdog-cascade';
import { WatchdogChronoMonitor } from './watchdog-chrono';
import { WatchdogChronoSynapticMonitor } from './watchdog-chrono-synaptic';
import { WatchdogFissureMonitor } from './watchdog-fissure';
import { WatchdogPrecognitionMonitor } from './watchdog-precognition';
import { WatchdogSwarmMonitor } from './watchdog-swarm';
import { watchdogIntegrityBridge } from './watchdog-integrity-bridge';
import {
  advanceBackendWatchdogTick,
  emitBackendWatchdogEvent,
  getBackendWatchdogStatus,
  setBackendWatchdogTick,
} from './watchdog-runtime';

export interface WatchdogFrameInput {
  tick?: number;
  cascadeActive?: boolean;
  dilationFactor?: number;
  tickTimeMs?: number;
  activeConnections?: number;
  npcCount?: number;
  entities?: { id: string; x: number; y: number; z: number }[];
  fissures?: { chunkId: string; paradoxType: string }[];
}

export class WatchdogOrchestrator {
  public readonly cascade = new WatchdogCascadeMonitor();
  public readonly chrono = new WatchdogChronoMonitor();
  public readonly chronoSynaptic = new WatchdogChronoSynapticMonitor();
  public readonly fissure = new WatchdogFissureMonitor();
  public readonly precognition = new WatchdogPrecognitionMonitor();
  public readonly swarm = new WatchdogSwarmMonitor();
  public readonly integrity = watchdogIntegrityBridge;

  public runFrame(input: WatchdogFrameInput = {}) {
    const tick = input.tick === undefined ? advanceBackendWatchdogTick() : setBackendWatchdogTick(input.tick);

    if (input.cascadeActive !== undefined) this.cascade.monitorCascade(input.cascadeActive, tick);
    if (input.dilationFactor !== undefined) this.chrono.monitorDilation(input.dilationFactor, tick);
    if (input.tickTimeMs !== undefined) this.chronoSynaptic.monitorTickTime(input.tickTimeMs, tick);
    if (input.activeConnections !== undefined || input.npcCount !== undefined) {
      this.precognition.feedData(input.activeConnections ?? 0, input.npcCount ?? 0, tick);
    }
    if (input.entities) this.swarm.evaluateEntities(input.entities, tick);
    if (input.fissures) {
      for (const fissure of input.fissures) {
        this.fissure.reportParadoxToBrain(fissure.chunkId, fissure.paradoxType, tick);
      }
    }

    emitBackendWatchdogEvent('WATCHDOG_FRAME_EVALUATED', {
      tick,
      checks: {
        cascade: input.cascadeActive !== undefined,
        chrono: input.dilationFactor !== undefined,
        chronoSynaptic: input.tickTimeMs !== undefined,
        precognition: input.activeConnections !== undefined || input.npcCount !== undefined,
        swarm: Boolean(input.entities),
        fissure: Boolean(input.fissures),
      },
      status: getBackendWatchdogStatus(),
    }, 'LOW', 'WATCHDOG_ORCHESTRATOR', tick);

    return getBackendWatchdogStatus();
  }
}

export const watchdogOrchestrator = new WatchdogOrchestrator();
