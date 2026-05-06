import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';

/**
 * Interface für den EventBus zur Vermeidung zirkulärer Abhängigkeiten.
 */
export interface IEventBus {
  publish(topic: string, payload: any): Promise<void>;
  subscribe(topic: string, handler: (data: any) => void): void;
}

/**
 * Struktur eines World-Events innerhalb der Areloria-Architektur.
 */
export interface WorldEvent {
  id: string;
  entityId: string;
  type: string;
  payload: any;
  timestamp: number;
  metadata: {
    energyCost: number;
    entropyImpact: number;
    creatorId: string;
  };
}

/**
 * Repräsentation des rekonstruierten Zustands.
 */
export interface EntityState {
  entityId: string;
  position: { x: number; y: number; z: number };
  energy: number;
  entropy: number;
  version: number;
  lastUpdate: number;
  attributes: Record<string, any>;
}

/**
 * OracleService Interface für Axiomatic Rules Validierung.
 */
export interface IOracleService {
  validateAxioms(state: EntityState, event: WorldEvent): { valid: boolean; error?: string };
}

@Injectable()
export class StateReconstructionEngine {
  private readonly logger = new Logger(StateReconstructionEngine.name);
  private readonly MAX_ENTROPY_THRESHOLD = 1000;

  constructor(
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    @Inject('IOracleService') private readonly oracle: IOracleService
  ) {}

  /**
   * Rekonstruiert den Zustand einer Entität basierend auf einer Event-Historie
   * unter strikter Einhaltung der axiomatischen Regeln (Energy/Entropy).
   */
  public async reconstructState(
    entityId: string,
    eventHistory: WorldEvent[],
    initialState?: EntityState
  ): Promise<EntityState> {
    this.logger.log(`Starting state reconstruction for entity: ${entityId}`);

    // Initialer Null-Zustand falls kein Snapshot existiert
    let currentState: EntityState = initialState || {
      entityId,
      position: { x: 0, y: 0, z: 0 },
      energy: 100, // Basis-Energie
      entropy: 0,
      version: 0,
      lastUpdate: Date.now(),
      attributes: {}
    };

    // Reduktion der Events zu einem finalen Zustand
    for (const event of eventHistory.sort((a, b) => a.timestamp - b.timestamp)) {
      currentState = this.applyEventWithAxioms(currentState, event);
    }

    return currentState;
  }

  /**
   * Kern-Reducer: Wendet ein Event auf den Zustand an und validiert Axiome.
   */
  private applyEventWithAxioms(state: EntityState, event: WorldEvent): EntityState {
    // 1. Axiomatische Validierung (Energy Conservation & Entropy Control)
    const validation = this.oracle.validateAxioms(state, event);
    
    if (!validation.valid) {
      this.logger.warn(`Axiomatic violation for entity ${state.entityId} at event ${event.id}: ${validation.error}`);
      // Bei Verletzung der Axiome wird das Event verworfen (Energy Conservation)
      return state; 
    }

    // 2. Entropy Control Check
    const projectedEntropy = state.entropy + (event.metadata.entropyImpact || 0);
    if (projectedEntropy > this.MAX_ENTROPY_THRESHOLD) {
      this.logger.error(`Critical Entropy limit reached for ${state.entityId}. System halt on this branch.`);
      return state;
    }

    // 3. State Mutation (Functional/Immutable)
    const nextState = { ...state };

    // Energie-Abzug nach dem Erhaltungssatz
    nextState.energy -= (event.metadata.energyCost || 0);
    nextState.entropy = projectedEntropy;
    nextState.version += 1;
    nextState.lastUpdate = event.timestamp;

    // Spezifische Logik basierend auf Event-Typ
    switch (event.type) {
      case 'MOVE':
        nextState.position = {
          x: event.payload.x ?? nextState.position.x,
          y: event.payload.y ?? nextState.position.y,
          z: event.payload.z ?? nextState.position.z,
        };
        break;
      case 'ATTRIBUTE_UPDATE':
        nextState.attributes = { ...nextState.attributes, ...event.payload };
        break;
      case 'ENERGY_REGEN':
        nextState.energy += event.payload.amount;
        break;
      default:
        this.logger.debug(`Generic event processing for type: ${event.type}`);
    }

    return nextState;
  }

  /**
   * Synchronisiert den rekonstruierten Zustand zurück in den EventBus (Optionaler Sync-Schritt)
   */
  public async broadcastStateSync(state: EntityState): Promise<void> {
    await this.eventBus.publish('state.reconstructed', {
      entityId: state.entityId,
      state,
      timestamp: Date.now()
    });
  }
}