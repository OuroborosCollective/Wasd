import { EventEmitter } from 'events';

/**
 * Interface für systemweite axiomatische Events.
 * Definiert die Grundstruktur für alle Ereignisse innerhalb des Areloria WASD Ökosystems.
 */
export interface IAxiomaticEvent {
  id: string;
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
   * @param l Der Eingabe-Seed (meist Timestamp oder Event-Sequenz-ID)
   * @returns Int32Array mit [Zeitachse, Pseudo-X, Pseudo-Y]
   */
  public static computeKappa(l: number): Int32Array {
    const kappaVector = new Int32Array(3);
    
    // 1. Zeitachse: l * KAPPA
    kappaVector[0] = Math.floor(l * this.KAPPA_CONSTANT);
    
    // 2. Pseudo X & Y basierend auf deterministischer Resonanz
    const resonanceX = this.computeResonance(l);
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
   * Erlaubt die Injektion von Event-Daten in den Resonance-Grid-Zustand.
   */
  public static calculateEventResonance(event: IAxiomaticEvent): number {
    const dataString = `${event.id}:${event.type}:${JSON.stringify(event.payload)}`;
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return this.computeResonance(Math.abs(hash));
  }
}

/**
 * AxiomaticEventBus
 * Zentraler Event-Hub der Areloria-Architektur. 
 * Implementiert ein Ring-Buffer-Ledger zur hochperformanten Speicherung der Event-Historie
 * und integriert die Resonance Grid Injection.
 */
export class AxiomaticEventBus extends EventEmitter {
  private static instance: AxiomaticEventBus;
  
  private readonly MAX_LEDGER_SIZE = 50000;
  private eventLedger: (IAxiomaticEvent | null)[];
  private writePointer: number = 0;
  private isFull: boolean = false;

  // Akkumulierter globaler Resonanz-Vektor (Resonance Grid State)
  private globalResonanceState: number = 0;

  private constructor() {
    super();
    this.setMaxListeners(500);
    this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
  }

  public static getInstance(): AxiomaticEventBus {
    if (!AxiomaticEventBus.instance) {
      AxiomaticEventBus.instance = new AxiomaticEventBus();
    }
    return AxiomaticEventBus.instance;
  }

  /**
   * Publiziert ein Event, führt die Resonance-Grid-Injektion durch und speichert es im Ledger.
   */
  public publish(event: IAxiomaticEvent): void {
    if (!event.id || !event.type) {
      console.error('[AxiomaticEventBus] Invalid event rejected:', event);
      return;
    }

    // 1. Resonance Grid Injection: Berechne r (deterministic resonance adjustment)
    const resonanceAdjustment = AREStateCompiler.calculateEventResonance(event);
    
    // 2. Kappa Coordinate Space Mapping (k)
    // Wir nutzen den Zeitstempel plus die neue Resonanz für die räumliche Verankerung
    const kappaVector = AREStateCompiler.computeKappa(event.timestamp + resonanceAdjustment);
    
    // 3. Update Event Metadata mit k und r
    event.metadata = {
      ...(event.metadata || {}),
      resonance: resonanceAdjustment,
      kappa: Array.from(kappaVector)
    };

    // 4. Update Global Resonance State (Grid Accumulator)
    this.globalResonanceState = (this.globalResonanceState + resonanceAdjustment) % 2147483647;

    // 5. Speicherung im Ledger
    this.eventLedger[this.writePointer] = event;
    
    this.writePointer++;
    if (this.writePointer >= this.MAX_LEDGER_SIZE) {
      this.writePointer = 0;
      this.isFull = true;
    }

    // 6. Trigger
    this.emit(event.type, event);
    this.emit('*', event);
  }

  /**
   * Gibt die Event-Historie in chronologischer Reihenfolge zurück.
   */
  public getHistory(): IAxiomaticEvent[] {
    if (!this.isFull) {
      return this.eventLedger.slice(0, this.writePointer) as IAxiomaticEvent[];
    }

    const oldestToWrap = this.eventLedger.slice(this.writePointer) as IAxiomaticEvent[];
    const wrapToNewest = this.eventLedger.slice(0, this.writePointer) as IAxiomaticEvent[];
    
    return [...oldestToWrap, ...wrapToNewest].filter(e => e !== null);
  }

  public getHistoryByType(type: string): IAxiomaticEvent[] {
    return this.getHistory().filter(e => e.type === type);
  }

  public clearLedger(): void {
    this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
    this.writePointer = 0;
    this.isFull = false;
    this.globalResonanceState = 0;
  }

  public getLedgerStats(): { size: number; max: number; full: boolean; currentResonance: number } {
    return {
      size: this.isFull ? this.MAX_LEDGER_SIZE : this.writePointer,
      max: this.MAX_LEDGER_SIZE,
      full: this.isFull,
      currentResonance: this.globalResonanceState
    };
  }
}

export const eventBus = AxiomaticEventBus.getInstance();