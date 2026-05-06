import { Injectable, Inject, Logger } from '@nestjs/common';

/**
 * AREPayload repräsentiert die Datenstruktur der Areloria Runtime Engine Events.
 */
export interface AREPayload {
  data: any;
  resonanceFactor?: number;
  kappaShift?: number;
  originatingNode: string;
}

/**
 * Struktur eines ARE-Events für das deterministische Replay.
 */
export interface AREEvent {
  id: string;
  entityId: string;
  type: string;
  payload: AREPayload;
  timestamp: number;
  sequence: number;
  metadata: {
    energyCost: number;
    entropyImpact: number;
    creatorId: string;
    signature: string;
  };
}

/**
 * Kappa-Bounds definieren die energetischen und entropischen Grenzwerte 
 * innerhalb derer eine Entität stabil bleibt.
 */
export interface KappaBounds {
  minEnergy: number;
  maxEntropy: number;
  resonanceThreshold: number;
}

/**
 * Der rekonstruierte Zustand unter Einbeziehung von Resonanz und Kappa-Stabilität.
 */
export interface ReconstructedState {
  entityId: string;
  position: { x: number; y: number; z: number };
  energy: number;
  entropy: number;
  resonance: number;
  version: number;
  lastSequence: number;
  lastUpdate: number;
  attributes: Record<string, any>;
  isStable: boolean;
}

/**
 * Watchdog Ruleset Interface für die Validierung von Kappa-Grenzbereichen.
 */
export interface IWatchdogService {
  verifyKappaBounds(state: ReconstructedState, event: AREEvent): { valid: boolean; violation?: string };
  checkResonanceConsistency(state: ReconstructedState, event: AREEvent): boolean;
  getGlobalKappaBounds(): KappaBounds;
}

/**
 * EventBus Interface für die Synchronisation.
 */
export interface IEventBus {
  publish(topic: string, payload: any): Promise<void>;
}

@Injectable()
export class StateReconstructionEngine {
  private readonly logger = new Logger(StateReconstructionEngine.name);

  constructor(
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    @Inject('IWatchdogService') private readonly watchdog: IWatchdogService
  ) {}

  /**
   * Führt ein deterministisches Replay einer Event-Historie durch, um den 
   * exakten Zustand einer Entität zu validieren.
   */
  public async reconstructDeterministicState(
    entityId: string,
    history: AREEvent[],
    snapshot?: ReconstructedState
  ): Promise<ReconstructedState> {
    this.logger.log(`Initiating deterministic replay for ${entityId} (Events: ${history.length})`);

    // Initialisierung basierend auf Snapshot oder Default-Resonanz
    let currentState: ReconstructedState = snapshot || {
      entityId,
      position: { x: 0, y: 0, z: 0 },
      energy: 100,
      entropy: 0,
      resonance: 1.0,
      version: 0,
      lastSequence: -1,
      lastUpdate: 0,
      attributes: {},
      isStable: true
    };

    // Deterministische Sortierung nach Sequence und Timestamp
    const sortedHistory = history.sort((a, b) => {
      if (a.sequence !== b.sequence) return a.sequence - b.sequence;
      return a.timestamp - b.timestamp;
    });

    for (const event of sortedHistory) {
      // Sequenz-Validierung zur Vermeidung von Lücken/Duplikaten im Replay
      if (event.sequence <= currentState.lastSequence) {
        this.logger.warn(`Skipping out-of-order/duplicate event: ${event.id} (Seq: ${event.sequence})`);
        continue;
      }

      currentState = this.applyAREEvent(currentState, event);
      
      // Abbruch bei Instabilität (Kappa-Kollaps)
      if (!currentState.isStable) {
        this.logger.error(`Entity ${entityId} collapsed at sequence ${event.sequence}. Halting reconstruction.`);
        break;
      }
    }

    return currentState;
  }

  /**
   * Wendet ein ARE-Event unter Einhaltung des Watchdog-Rulesets an.
   */
  private applyAREEvent(state: ReconstructedState, event: AREEvent): ReconstructedState {
    // 1. Kappa-Bounds Verifizierung (Axiomatische Integrität)
    const kappaCheck = this.watchdog.verifyKappaBounds(state, event);
    if (!kappaCheck.valid) {
      this.logger.warn(`Kappa-Bound violation: ${kappaCheck.violation} on entity ${state.entityId}`);
      return { ...state, isStable: false, lastUpdate: event.timestamp };
    }

    // 2. Resonanz-Konsistenz-Check (Kappa-Frequenz Analyse)
    const resonanceValid = this.watchdog.checkResonanceConsistency(state, event);
    if (!resonanceValid) {
      this.logger.warn(`Resonance inconsistency detected for event ${event.id}`);
      // Inkonsistenz führt zu Entropie-Anstieg statt sofortigem Stop
      state.entropy += (event.metadata.entropyImpact * 1.5);
    }

    // 3. Deterministische Zustandsmutation
    const nextState: ReconstructedState = {
      ...state,
      energy: state.energy - (event.metadata.energyCost || 0),
      entropy: state.entropy + (event.metadata.entropyImpact || 0),
      resonance: state.resonance + (event.payload.resonanceFactor || 0),
      version: state.version + 1,
      lastSequence: event.sequence,
      lastUpdate: event.timestamp
    };

    // Spezifische ARE-Payload Prozessierung
    switch (event.type) {
      case 'POSITION_SHIFT':
        nextState.position = {
          x: event.payload.data.x ?? state.position.x,
          y: event.payload.data.y ?? state.position.y,
          z: event.payload.data.z ?? state.position.z,
        };
        break;

      case 'RESONANCE_SYNC':
        nextState.resonance = event.payload.data.targetResonance;
        break;

      case 'KAPPA_ADJUST':
        nextState.attributes = { 
          ...nextState.attributes, 
          kappaModifier: event.payload.data.modifier 
        };
        break;

      case 'ENTITY_MODIFICATION':
        nextState.attributes = { 
          ...nextState.attributes, 
          ...event.payload.data 
        };
        break;

      default:
        this.logger.debug(`Generic processing for ARE type: ${event.type}`);
    }

    // Finaler Stabilitäts-Check gegen Global Bounds
    const bounds = this.watchdog.getGlobalKappaBounds();
    if (nextState.entropy > bounds.maxEntropy || nextState.energy < bounds.minEnergy) {
      nextState.isStable = false;
    }

    return nextState;
  }

  /**
   * Synchronisiert den finalen validierten Zustand in den globalen State-Kanal.
   */
  public async broadcastValidatedState(state: ReconstructedState): Promise<void> {
    await this.eventBus.publish('engine.state.validated', {
      entityId: state.entityId,
      state,
      checksum: this.generateStateChecksum(state),
      timestamp: Date.now()
    });
  }

  /**
   * Generiert eine Checksumme für die deterministische Validierung zwischen Knoten.
   */
  private generateStateChecksum(state: ReconstructedState): string {
    const raw = `${state.entityId}-${state.lastSequence}-${state.energy}-${state.entropy}-${state.resonance}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0; 
    }
    return hash.toString(16);
  }
}