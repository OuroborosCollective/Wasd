import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

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
   * Die Kappa-Konstante (κ)
   * κ = (GoldenRatio * c^2) / SingularityDensity
   */
  private readonly KAPPA = 1.61803398875 * Math.pow(299792458, 2) / 1e17;

  private globalTruthState: TruthState;
  
  // Resilienz-Layer: Lokaler Cache-Buffer für nicht persistierte Events
  private eventBuffer: OracleEvent[] = [];
  private isProcessingBuffer = false;
  private isDbConnected = true; // Simulierter Verbindungsstatus

  constructor() {
    this.initializeOracle();
  }

  onModuleInit() {
    // Starte Hintergrund-Synchronisation
    setInterval(() => this.flushBuffer(), 5000);
  }

  /**
   * Initialisiert den globalen Wahrheitszustand basierend auf den 13 LogicPoints und 6 ARE-Regeln.
   */
  private initializeOracle(): void {
    const initialLogicPoints: Record<LogicPoint, number> = {
      [LogicPoint.ORIGIN]: 1.0,
      [LogicPoint.IDENTITY]: 1.0,
      [LogicPoint.RELATION]: 1.0,
      [LogicPoint.FLOW]: 1.0,
      [LogicPoint.VOID]: 0.0,
      [LogicPoint.SYNTHESIS]: 1.0,
      [LogicPoint.DUALITY]: 0.5,
      [LogicPoint.SYMMETRY]: 1.0,
      [LogicPoint.SINGULARITY]: 0.0,
      [LogicPoint.FORM]: 1.0,
      [LogicPoint.OBSERVER]: 1.0,
      [LogicPoint.ENERGY]: 1.0,
      [LogicPoint.ENTROPY]: 0.01,
    };

    this.globalTruthState = {
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

    this.logger.log(`Axiomatic Oracle initialized with Kappa: ${this.KAPPA}`);
  }

  /**
   * Berechnet die Realitäts-Kohärenz basierend auf der Kappa-Konstante.
   */
  public calculateCoherence(inputVector: number[]): number {
    const sum = inputVector.reduce((acc, val) => acc + val, 0);
    const relativisticFactor = Math.sqrt(Math.max(0, 1 - Math.pow(this.KAPPA / 1e18, 2)));
    const singularityLimit = Math.exp(-sum / this.KAPPA);
    
    return (sum * this.KAPPA * relativisticFactor) / (1 + singularityLimit);
  }

  /**
   * Validiert eine Zustandsänderung gegen die 6 axiomatischen ARE-Regeln.
   */
  public validateAxiomaticIntegrity(proposedChanges: Partial<Record<LogicPoint, number>>): boolean {
    if (proposedChanges[LogicPoint.VOID] && proposedChanges[LogicPoint.VOID] > 1.0) return false;
    if (proposedChanges[LogicPoint.ORIGIN] !== undefined && proposedChanges[LogicPoint.ORIGIN] !== this.globalTruthState.logicPoints[LogicPoint.ORIGIN]) return false;
    if (proposedChanges[LogicPoint.ENERGY] && proposedChanges[LogicPoint.ENERGY] < 0) return false;
    
    const formStability = proposedChanges[LogicPoint.FORM] ?? this.globalTruthState.logicPoints[LogicPoint.FORM];
    if (formStability <= 0) return false;

    const currentEntropy = this.globalTruthState.logicPoints[LogicPoint.ENTROPY];
    const newEntropy = proposedChanges[LogicPoint.ENTROPY] ?? currentEntropy;
    if (newEntropy > this.KAPPA * 100) return false;

    return true;
  }

  /**
   * Führt eine atomare Zustandsaktualisierung im globalTruthState durch.
   * Persistenz erfolgt nicht-blockierend über einen Buffer.
   */
  public updateTruthState(changes: Partial<Record<LogicPoint, number>>): TruthState {
    if (!this.validateAxiomaticIntegrity(changes)) {
      this.logger.error('Axiomatic Violation detected. Update rejected.');
      throw new Error('ARE_AXIOM_VIOLATION: Proposed state violates fundamental laws.');
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

    // Event für asynchrone Persistenz buffern
    this.enqueueEvent({
      id: crypto.randomUUID(),
      type: 'STATE_UPDATE',
      payload: changes,
      timestamp: Date.now(),
      retryCount: 0,
    });

    return this.globalTruthState;
  }

  private enqueueEvent(event: OracleEvent): void {
    this.eventBuffer.push(event);
    this.flushBuffer();
  }

  /**
   * Versucht den Buffer zu leeren und die Events in die DB zu schreiben.
   * Resilient gegen Verbindungsabbrüche.
   */
  private async flushBuffer(): Promise<void> {
    if (this.isProcessingBuffer || this.eventBuffer.length === 0) return;
    this.isProcessingBuffer = true;

    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Simulierter Datenbank-Schreibvorgang
      await this.persistToDatabase(eventsToProcess);
      this.isDbConnected = true;
      this.logger.debug(`Successfully persisted ${eventsToProcess.length} Oracle events.`);
    } catch (error) {
      this.isDbConnected = false;
      this.logger.warn(`Database connection interrupted. Buffering ${eventsToProcess.length} events for later sync.`);
      
      // Re-queue events with incremented retry count
      eventsToProcess.forEach(e => {
        if (e.retryCount < 50) { // Max retries before dropping or DLQ
          e.retryCount++;
          this.eventBuffer.unshift(e);
        }
      });
    } finally {
      this.isProcessingBuffer = false;
    }
  }

  private async persistToDatabase(events: OracleEvent[]): Promise<void> {
    // Hier würde die tatsächliche Datenbank-Logik (Prisma/TypeORM/Mongoose) stehen.
    // Für die Simulation werfen wir einen Fehler, wenn die "Verbindung" weg ist.
    if (Math.random() < 0.05) throw new Error('DB_CONN_LOST'); 
    return Promise.resolve();
  }

  public getGlobalTruthState(): TruthState {
    return this.globalTruthState;
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

  public projectPlatonicForm(id: string, attributes: any): boolean {
    const symmetry = this.globalTruthState.logicPoints[LogicPoint.SYMMETRY];
    const identityValue = this.globalTruthState.logicPoints[LogicPoint.IDENTITY];
    const stabilityScore = (symmetry * identityValue) / this.KAPPA;
    return stabilityScore > 0.0001;
  }
}

export const SOURCE = Object.freeze(LogicPoint.ORIGIN);