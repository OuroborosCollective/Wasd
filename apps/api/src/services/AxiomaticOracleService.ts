import { Injectable, Logger, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * ARE (Areloria Reality Engine) Axiomatic Rules
 */
export interface AxiomaticRules {
  consistency: boolean;      // Widerspruchsfreiheit
  causality: boolean;        // Kausalität
  sovereignty: boolean;      // Souveränität
  energyConservation: boolean; // Energie-Erhaltung
  observerIndependence: boolean; // Beobachter-Unabhängigkeit
  entropyControl: boolean;   // Entropie-Kontrolle
}

/**
 * 13 Centralized LogicPoints (SOURCE)
 */
export enum LogicPoint {
  ORIGIN = 'ORIGIN',
  IDENTITY = 'IDENTITY',
  RELATION = 'RELATION',
  FLOW = 'FLOW',
  VOID = 'VOID',
  SYNTHESIS = 'SYNTHESIS',
  DUALITY = 'DUALITY',
  SYMMETRY = 'SYMMETRY',
  SINGULARITY = 'SINGULARITY',
  FORM = 'FORM',
  OBSERVER = 'OBSERVER',
  ENERGY = 'ENERGY',
  ENTROPY = 'ENTROPY',
}

export interface TruthState {
  kappa: number;
  logicPoints: Record<LogicPoint, number>;
  rules: AxiomaticRules;
  timestamp: number;
  hash: string;
}

export interface OracleEvent {
  id: string;
  type: 'STATE_UPDATE' | 'AXIOM_REVISION';
  payload: Partial<Record<LogicPoint, number>>;
  timestamp: number;
  retryCount: number;
}

@Injectable()
export class AxiomaticOracleService implements OnModuleInit {
  private readonly logger = new Logger(AxiomaticOracleService.name);

  /**
   * KAPPA STANDARD: Fixed-Point Math (Kappa=1000)
   */
  private readonly KAPPA = 1000;
  private readonly QUERY_TIMEOUT_MS = 2500;
  private readonly PERSISTENCE_TIMEOUT_MS = 4000;
  private readonly MAX_RETRY_ATTEMPTS = 10;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;

  private globalTruthState: TruthState;
  private eventBuffer: OracleEvent[] = [];
  private isProcessingBuffer = false;
  private dbFailureCount = 0;
  private isCircuitOpen = false;

  constructor() {
    this.globalTruthState = this.initializeOracle();
    this.logger.log(`Axiomatic Oracle initialized with Fixed-Point Kappa: ${this.KAPPA}`);
  }

  onModuleInit() {
    // Hintergrund-Synchronisation für persistente I/O Operationen
    setInterval(() => {
      if (!this.isCircuitOpen) {
        this.flushBuffer().catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Unknown buffer error';
          this.logger.error(`Buffer flush error: ${msg}`);
        });
      } else {
        this.attemptCircuitReset();
      }
    }, 5000);
  }

  private initializeOracle(): TruthState {
    // Werte skaliert auf Kappa=1000
    const initialLogicPoints: Record<LogicPoint, number> = {
      [LogicPoint.ORIGIN]: 1000,
      [LogicPoint.IDENTITY]: 1000,
      [LogicPoint.RELATION]: 1000,
      [LogicPoint.FLOW]: 1000,
      [LogicPoint.VOID]: 0,
      [LogicPoint.SYNTHESIS]: 1000,
      [LogicPoint.DUALITY]: 500,
      [LogicPoint.SYMMETRY]: 1000,
      [LogicPoint.SINGULARITY]: 0,
      [LogicPoint.FORM]: 1000,
      [LogicPoint.OBSERVER]: 1000,
      [LogicPoint.ENERGY]: 1000,
      [LogicPoint.ENTROPY]: 10,
    };

    return {
      kappa: this.KAPPA,
      logicPoints: Object.freeze(initialLogicPoints),
      rules: {
        consistency: true,
        causality: true,
        sovereignty: true,
        energyConservation: true,
        observerIndependence: true,
        entropyControl: true,
      },
      timestamp: Date.now(),
      hash: this.calculateStateHash(initialLogicPoints),
    };
  }

  public async getGlobalTruthStateAsync(): Promise<TruthState> {
    return Promise.race([
      new Promise<TruthState>((resolve) => resolve(this.globalTruthState)),
      new Promise<TruthState>((_, reject) => 
        setTimeout(() => reject(new Error('ORACLE_QUERY_TIMEOUT')), this.QUERY_TIMEOUT_MS)
      )
    ]);
  }

  public getGlobalTruthStateSync(): TruthState {
    return this.globalTruthState;
  }

  /**
   * Deterministische Kohärenz-Berechnung (Integer-basiert).
   */
  public calculateCoherence(inputVector: number[]): number {
    try {
      const sum = inputVector.reduce((acc, val) => acc + val, 0);
      // Approximation ohne Floats wo möglich; Kappa dient als Skalierungsfaktor
      if (sum === 0) return 0;
      return Math.floor((sum * this.KAPPA) / (sum + this.KAPPA));
    } catch (e) {
      this.logger.warn('Coherence calculation failed, returning safe default.');
      return 500;
    }
  }

  public validateAxiomaticIntegrity(proposedChanges: Partial<Record<LogicPoint, number>>): boolean {
    const currentState = this.globalTruthState.logicPoints;

    if (proposedChanges[LogicPoint.VOID] !== undefined && proposedChanges[LogicPoint.VOID] > this.KAPPA) return false;
    if (proposedChanges[LogicPoint.ORIGIN] !== undefined && proposedChanges[LogicPoint.ORIGIN] !== currentState[LogicPoint.ORIGIN]) return false;
    if (proposedChanges[LogicPoint.ENERGY] !== undefined && proposedChanges[LogicPoint.ENERGY] < 0) return false;
    
    const formStability = proposedChanges[LogicPoint.FORM] ?? currentState[LogicPoint.FORM];
    if (formStability <= 0) return false;

    const currentEntropy = currentState[LogicPoint.ENTROPY];
    const newEntropy = proposedChanges[LogicPoint.ENTROPY] ?? currentEntropy;
    if (newEntropy > this.KAPPA * 100) return false;

    return true;
  }

  public updateTruthState(changes: Partial<Record<LogicPoint, number>>): TruthState {
    if (!this.validateAxiomaticIntegrity(changes)) {
      this.logger.error('Axiomatic Violation detected. Update rejected.');
      throw new HttpException('ARE_AXIOM_VIOLATION', HttpStatus.CONFLICT);
    }

    const newLogicPoints = {
      ...this.globalTruthState.logicPoints,
      ...changes,
    };

    this.globalTruthState = {
      ...this.globalTruthState,
      logicPoints: Object.freeze(newLogicPoints),
      timestamp: Date.now(),
      hash: this.calculateStateHash(newLogicPoints),
    };

    this.enqueueEvent({
      id: randomUUID(),
      type: 'STATE_UPDATE',
      payload: changes,
      timestamp: Date.now(),
      retryCount: 0,
    });

    return this.globalTruthState;
  }

  private enqueueEvent(event: OracleEvent): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > 1000) {
      this.logger.warn('Event buffer overflow. Dropping oldest events.');
      this.eventBuffer.shift();
    }
    this.flushBuffer().catch(() => {});
  }

  private async flushBuffer(): Promise<void> {
    if (this.isProcessingBuffer || this.eventBuffer.length === 0 || this.isCircuitOpen) return;
    this.isProcessingBuffer = true;

    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await Promise.race([
        this.persistToDatabase(eventsToProcess),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PERSISTENCE_TIMEOUT')), this.PERSISTENCE_TIMEOUT_MS)
        )
      ]);
      
      this.dbFailureCount = 0;
      this.logger.debug(`Successfully persisted ${eventsToProcess.length} Oracle events.`);
    } catch (error: unknown) {
      // Cast unknown to Error to access message property safely
      const errorMessage = error instanceof Error ? error.message : 'Unknown persistence error';
      
      this.dbFailureCount++;
      this.logger.warn(`Database sync failed (${this.dbFailureCount}/${this.CIRCUIT_BREAKER_THRESHOLD}): ${errorMessage}`);
      
      eventsToProcess.forEach(e => {
        if (e.retryCount < this.MAX_RETRY_ATTEMPTS) {
          e.retryCount++;
          this.eventBuffer.unshift(e);
        }
      });

      if (this.dbFailureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.isCircuitOpen = true;
        this.logger.error('Circuit breaker OPEN: Database streams are non-responsive.');
      }
    } finally {
      this.isProcessingBuffer = false;
    }
  }

  private async attemptCircuitReset(): Promise<void> {
    this.logger.log('Attempting circuit breaker reset...');
    try {
      await this.persistToDatabase([]); 
      this.isCircuitOpen = false;
      this.dbFailureCount = 0;
      this.logger.log('Circuit breaker CLOSED: Database connection restored.');
    } catch (error: unknown) {
      this.logger.warn('Circuit breaker reset failed. Retrying in next interval.');
    }
  }

  private async persistToDatabase(events: OracleEvent[]): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.05) {
          reject(new Error('DB_CONN_LOST'));
        } else {
          resolve();
        }
      }, 100);
    });
  }

  private calculateStateHash(points: Record<LogicPoint, number>): string {
    const data = JSON.stringify(points) + this.KAPPA.toString();
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(16);
  }

  public projectPlatonicForm(id: string, attributes: Record<string, unknown>): boolean {
    try {
      const symmetry = this.globalTruthState.logicPoints[LogicPoint.SYMMETRY];
      const identityValue = this.globalTruthState.logicPoints[LogicPoint.IDENTITY];
      // Fixed point stability check
      const stabilityScore = (symmetry * identityValue) / this.KAPPA;
      return stabilityScore > 0;
    } catch (e) {
      return false;
    }
  }
}

export const SOURCE = Object.freeze(LogicPoint.ORIGIN);