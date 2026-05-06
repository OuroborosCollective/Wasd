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
  metadata?: Record<string, any>;
  version: number;
}

/**
 * AREStateCompiler
 * Implementiert deterministische Berechnungslogik für den Weltzustand.
 * Nutzt plattformunabhängige Algorithmen zur Sicherstellung der Synchronität zwischen Client und Server.
 */
export class AREStateCompiler {
  private static readonly KAPPA_CONSTANT = 1024;

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
    // Sicherstellung, dass l positiv ist für Modulo-Operation
    const seed = Math.abs(Math.floor(l)) || 1;
    return (seed * 16807) % 2147483647;
  }
}

/**
 * AxiomaticEventBus
 * Zentraler Event-Hub der Areloria-Architektur. 
 * Implementiert ein Ring-Buffer-Ledger zur hochperformanten Speicherung der Event-Historie.
 */
export class AxiomaticEventBus extends EventEmitter {
  private static instance: AxiomaticEventBus;
  
  private readonly MAX_LEDGER_SIZE = 50000;
  private eventLedger: (IAxiomaticEvent | null)[];
  private writePointer: number = 0;
  private isFull: boolean = false;

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
   * Publiziert ein Event und speichert es im Ring-Buffer Ledger.
   */
  public publish(event: IAxiomaticEvent): void {
    if (!event.id || !event.type) {
      console.error('[AxiomaticEventBus] Invalid event rejected:', event);
      return;
    }

    // Speicherung im Ledger
    this.eventLedger[this.writePointer] = event;
    
    this.writePointer++;
    if (this.writePointer >= this.MAX_LEDGER_SIZE) {
      this.writePointer = 0;
      this.isFull = true;
    }

    // Trigger
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
  }

  public getLedgerStats(): { size: number; max: number; full: boolean } {
    return {
      size: this.isFull ? this.MAX_LEDGER_SIZE : this.writePointer,
      max: this.MAX_LEDGER_SIZE,
      full: this.isFull
    };
  }
}

export const eventBus = AxiomaticEventBus.getInstance();