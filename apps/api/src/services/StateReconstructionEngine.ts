import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * FIXED-POINT CONFIGURATION
 * To ensure 100% determinism across different JS engines/architectures,
 * we use BigInt based fixed-point arithmetic (6 decimal places).
 */
const FP_SCALE = 1000000n;

const toFP = (val: number): bigint => BigInt(Math.round(val * Number(FP_SCALE)));
const fromFP = (val: bigint): number => Number(val) / Number(FP_SCALE);

export interface AREPayload {
  data: any;
  resonanceFactor?: number;
  kappaShift?: number;
  originatingNode: string;
}

export interface AREEvent {
  id: string;
  entityId: string;
  type: string;
  payload: AREPayload;
  timestamp: number;
  sequence: number;
  frame: number; // Mandatory for frame-based sequencing
  metadata: {
    energyCost: number;
    entropyImpact: number;
    creatorId: string;
    signature: string;
  };
}

export interface KappaBounds {
  minEnergy: bigint;
  maxEntropy: bigint;
  resonanceThreshold: bigint;
}

export interface ReconstructedState {
  entityId: string;
  // Position stored in fixed-point BigInt for reproducibility
  position: { x: bigint; y: bigint; z: bigint };
  energy: bigint;
  entropy: bigint;
  resonance: bigint;
  version: number;
  lastSequence: number;
  lastFrame: number;
  lastUpdate: number;
  attributes: Record<string, any>;
  isStable: boolean;
}

export interface IWatchdogService {
  verifyKappaBounds(state: ReconstructedState, event: AREEvent): { valid: boolean; violation?: string };
  checkResonanceConsistency(state: ReconstructedState, event: AREEvent): boolean;
  getGlobalKappaBounds(): KappaBounds;
}

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
   * Performs a deterministic replay of an event history using frame-based sequencing.
   */
  public async reconstructDeterministicState(
    entityId: string,
    history: AREEvent[],
    snapshot?: ReconstructedState
  ): Promise<ReconstructedState> {
    this.logger.log(`Replaying Frame-Based Sequence for ${entityId} (Events: ${history.length})`);

    let currentState: ReconstructedState = snapshot || {
      entityId,
      position: { x: 0n, y: 0n, z: 0n },
      energy: 100n * FP_SCALE,
      entropy: 0n,
      resonance: 1n * FP_SCALE,
      version: 0,
      lastSequence: -1,
      lastFrame: -1,
      lastUpdate: 0,
      attributes: {},
      isStable: true
    };

    // Deterministic Sort: Frame -> Sequence -> Timestamp
    const sortedHistory = [...history].sort((a, b) => {
      if (a.frame !== b.frame) return a.frame - b.frame;
      if (a.sequence !== b.sequence) return a.sequence - b.sequence;
      return a.timestamp - b.timestamp;
    });

    for (const event of sortedHistory) {
      // Replay Validation
      if (event.frame < currentState.lastFrame || (event.frame === currentState.lastFrame && event.sequence <= currentState.lastSequence)) {
        this.logger.warn(`Deterministic skipping: Event ${event.id} violates monotonic timeline (Frame: ${event.frame}, Seq: ${event.sequence})`);
        continue;
      }

      currentState = this.applyAREEvent(currentState, event);
      
      if (!currentState.isStable) {
        this.logger.error(`Critical Kappa-Collapse at Frame ${event.frame} (Entity: ${entityId})`);
        break;
      }
    }

    return currentState;
  }

  /**
   * Applies an AREEvent with fixed-point arithmetic for state mutation.
   */
  private applyAREEvent(state: ReconstructedState, event: AREEvent): ReconstructedState {
    // 1. Axiomatic Integrity Check
    const kappaCheck = this.watchdog.verifyKappaBounds(state, event);
    if (!kappaCheck.valid) {
      this.logger.warn(`Integrity Violation: ${kappaCheck.violation}`);
      return { ...state, isStable: false, lastUpdate: event.timestamp };
    }

    // 2. Kappa Frequency Analysis (Resonance Consistency)
    const resonanceValid = this.watchdog.checkResonanceConsistency(state, event);
    const entropyMultiplier = resonanceValid ? 1n : 2n;

    // 3. Fixed-Point State Mutation
    const nextState: ReconstructedState = {
      ...state,
      energy: state.energy - toFP(event.metadata.energyCost || 0),
      entropy: state.entropy + (toFP(event.metadata.entropyImpact || 0) * entropyMultiplier),
      resonance: state.resonance + toFP(event.payload.resonanceFactor || 0),
      version: state.version + 1,
      lastSequence: event.sequence,
      lastFrame: event.frame,
      lastUpdate: event.timestamp
    };

    // 4. Determinstic Payload Execution
    switch (event.type) {
      case 'POSITION_SHIFT':
        nextState.position = {
          x: event.payload.data.x !== undefined ? toFP(event.payload.data.x) : state.position.x,
          y: event.payload.data.y !== undefined ? toFP(event.payload.data.y) : state.position.y,
          z: event.payload.data.z !== undefined ? toFP(event.payload.data.z) : state.position.z,
        };
        break;

      case 'RESONANCE_SYNC':
        nextState.resonance = toFP(event.payload.data.targetResonance);
        break;

      case 'ENTITY_MODIFICATION':
        nextState.attributes = { 
          ...nextState.attributes, 
          ...event.payload.data 
        };
        break;

      default:
        this.logger.debug(`Generic deterministic processing for type: ${event.type}`);
    }

    // 5. Stability Constraint Check
    const globalBounds = this.watchdog.getGlobalKappaBounds();
    if (nextState.entropy > globalBounds.maxEntropy || nextState.energy < globalBounds.minEnergy) {
      nextState.isStable = false;
    }

    return nextState;
  }

  /**
   * Broadcasts the validated state with a deterministic SHA-256 checksum.
   */
  public async broadcastValidatedState(state: ReconstructedState): Promise<void> {
    const checksum = this.generateDeterministicChecksum(state);
    
    await this.eventBus.publish('engine.state.validated', {
      entityId: state.entityId,
      state: this.exportStateForNetwork(state),
      checksum,
      timestamp: Date.now(),
      frame: state.lastFrame
    });
  }

  /**
   * Converts BigInt state to serializable number format for network transport.
   */
  private exportStateForNetwork(state: ReconstructedState) {
    return {
      ...state,
      position: {
        x: fromFP(state.position.x),
        y: fromFP(state.position.y),
        z: fromFP(state.position.z),
      },
      energy: fromFP(state.energy),
      entropy: fromFP(state.entropy),
      resonance: fromFP(state.resonance)
    };
  }

  /**
   * Generates a cryptographic checksum of the internal fixed-point state.
   */
  private generateDeterministicChecksum(state: ReconstructedState): string {
    const canonicalPayload = [
      state.entityId,
      state.lastFrame.toString(),
      state.lastSequence.toString(),
      state.position.x.toString(),
      state.position.y.toString(),
      state.position.z.toString(),
      state.energy.toString(),
      state.entropy.toString(),
      state.resonance.toString(),
      JSON.stringify(Object.keys(state.attributes).sort().reduce((obj, key) => {
        obj[key] = state.attributes[key];
        return obj;
      }, {} as any))
    ].join('|');

    return createHash('sha256').update(canonicalPayload).digest('hex');
  }
}