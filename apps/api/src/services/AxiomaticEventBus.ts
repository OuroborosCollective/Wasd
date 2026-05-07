import { EventEmitter } from 'events';

/**
 * Interface für systemweite axiomatische Events.
 * Definiert die Grundstruktur für alle Ereignisse innerhalb des Areloria WASD Ökosystems.
 */
export interface IAxiomaticEvent {
  id: string;
  sequenceId: number; // Strikte globale Sequenz-ID für deterministische Replays
  type: string;
  timestamp: number;
  payload: any;
  actorId?: string;
  metadata?: {
    resonance?: number;
    kappa?: number[];
    [key: string]: any;
  };
  version: number;
}

/**
 * AREStateCompiler
 * Implementiert deterministische Berechnungslogik für den Weltzustand.
 * Nutzt plattformunabhängige Algorithmen zur Sicherstellung der Synchronität zwischen Client und Server.
 */
export class AREStateCompiler {
  private static readonly KAPPA_CONSTANT = 1024;
  private static readonly RESONANCE_PRIME = 16807;
  private static readonly RESONANCE_MAX = 2147483647;

  /**
   * Berechnet den Kappa-Vektor für die raumzeitliche Verankerung.
   * Nutzt die Sequenz-ID und Resonanz zur stabilen Koordinaten-Projektion.
   */
  public static computeKappa(seed: number): Int32Array {
    const kappaVector = new Int32Array(3);
    
    // 1. Zeitachse/Sequenz-Basis: seed * KAPPA
    kappaVector[0] = Math.floor(seed * this.KAPPA_CONSTANT);
    
    // 2. Pseudo X & Y basierend auf deterministischer Resonanz
    const resonanceX = this.computeResonance(seed);
    const resonanceY = this.computeResonance(resonanceX);
    
    kappaVector[1] = resonanceX % 10000; 
    kappaVector[2] = resonanceY % 10000;
    
    return kappaVector;
  }

  /**
   * Lehmer Random Number Generator für plattformunabhängigen Determinismus.
   * Formel: (l * 16807) % 2147483647
   */
  public static computeResonance(l: number): number {
    const seed = Math.abs(Math.floor(l)) || 1;
    return (seed * this.RESONANCE_PRIME) % this.RESONANCE_MAX;
  }

  /**
   * Berechnet eine deterministische Resonanz-Verschiebung (r) basierend auf dem Event-Inhalt.
   * Die sequenceId wird einbezogen, um Kollisionen bei identischem Payload zu vermeiden.
   */
  public static calculateEventResonance(event: IAxiomaticEvent): number {
    const dataString = `${event.sequenceId}:${event.id}:${event.type}:${JSON.stringify(event.payload)}`;
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Zu 32bit Integer konvertieren
    }
    return this.computeResonance(Math.abs(hash));
  }
}

/**
 * AxiomaticEventBus
 * Zentraler Event-Hub der Areloria-Architektur. 
 * Implementiert ein Ring-Buffer-Ledger zur hochperformanten Speicherung der Event-Historie
 * und erzwingt eine strikte globale Sequence-ID zur Eliminierung von Out-of-Order Execution.
 */
export class AxiomaticEventBus extends EventEmitter {
  private static instance: AxiomaticEventBus;
  
  private readonly MAX_LEDGER_SIZE = 50000;
  private eventLedger: (IAxiomaticEvent | null)[];
  private writePointer: number = 0;
  private isFull: boolean = false;

  // Strikter globaler Sequenz-Zähler
  private globalSequenceId: number = 0;
  // Akkumulierter globaler Resonanz-Vektor (Resonance Grid State)
  private globalResonanceState: number = 0;

  private constructor() {
    super();
    this.setMaxListeners(1000);
    this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
  }

  public static getInstance(): AxiomaticEventBus {
    if (!AxiomaticEventBus.instance) {
      AxiomaticEventBus.instance = new AxiomaticEventBus();
    }
    return AxiomaticEventBus.instance;
  }

  /**
   * Publiziert ein Event, weist die globale Sequenz-ID zu und führt die Resonance-Grid-Injektion durch.
   */
  public publish(event: Omit<IAxiomaticEvent, 'sequenceId'>): void {
    if (!event.id || !event.type) {
      console.error('[AxiomaticEventBus] Invalid event rejected:', event);
      return;
    }

    // 1. Zuweisung der strikten globalen Sequenz-ID
    const sequencedEvent = event as IAxiomaticEvent;
    sequencedEvent.sequenceId = this.globalSequenceId++;

    // 2. Resonance Grid Injection: Berechne r (deterministic resonance adjustment)
    const resonanceAdjustment = AREStateCompiler.calculateEventResonance(sequencedEvent);
    
    // 3. Kappa Coordinate Space Mapping (k)
    // Nutzt sequenceId zur Sicherstellung der Ordnung bei Zeitstempel-Gleichheit
    const kappaVector = AREStateCompiler.computeKappa(sequencedEvent.sequenceId + resonanceAdjustment);
    
    // 4. Update Event Metadata mit k und r
    sequencedEvent.metadata = {
      ...(sequencedEvent.metadata || {}),
      resonance: resonanceAdjustment,
      kappa: Array.from(kappaVector)
    };

    // 5. Update Global Resonance State (Grid Accumulator)
    this.globalResonanceState = (this.globalResonanceState + resonanceAdjustment) % 2147483647;

    // 6. Speicherung im Ledger (Ring-Buffer)
    this.eventLedger[this.writePointer] = sequencedEvent;
    
    this.writePointer++;
    if (this.writePointer >= this.MAX_LEDGER_SIZE) {
      this.writePointer = 0;
      this.isFull = true;
    }

    // 7. Emission für Echtzeit-Verarbeitung
    this.emit(sequencedEvent.type, sequencedEvent);
    this.emit('*', sequencedEvent);
  }

  /**
   * Gibt die Event-Historie in exakter chronologischer Sequenz-Reihenfolge zurück.
   */
  public getHistory(): IAxiomaticEvent[] {
    let history: IAxiomaticEvent[];

    if (!this.isFull) {
      history = this.eventLedger.slice(0, this.writePointer) as IAxiomaticEvent[];
    } else {
      const oldestToWrap = this.eventLedger.slice(this.writePointer) as IAxiomaticEvent[];
      const wrapToNewest = this.eventLedger.slice(0, this.writePointer) as IAxiomaticEvent[];
      history = [...oldestToWrap, ...wrapToNewest].filter(e => e !== null) as IAxiomaticEvent[];
    }

    // Zusätzlicher Safety-Sort nach SequenceID für Replays
    return history.sort((a, b) => a.sequenceId - b.sequenceId);
  }

  public getHistoryByType(type: string): IAxiomaticEvent[] {
    return this.getHistory().filter(e => e.type === type);
  }

  /**
   * Setzt den Bus zurück (nur für Testing/Szenario-Resets).
   */
  public clearLedger(): void {
    this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
    this.writePointer = 0;
    this.isFull = false;
    this.globalSequenceId = 0;
    this.globalResonanceState = 0;
  }

  public getLedgerStats(): { 
    size: number; 
    max: number; 
    full: boolean; 
    currentResonance: number;
    lastSequenceId: number;
  } {
    return {
      size: this.isFull ? this.MAX_LEDGER_SIZE : this.writePointer,
      max: this.MAX_LEDGER_SIZE,
      full: this.isFull,
      currentResonance: this.globalResonanceState,
      lastSequenceId: this.globalSequenceId - 1
    };
  }
}

export const eventBus = AxiomaticEventBus.getInstance();