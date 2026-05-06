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
 * AxiomaticEventBus
 * Zentraler Event-Hub der Areloria-Architektur. 
 * Implementiert ein Ring-Buffer-Ledger zur hochperformanten Speicherung der Event-Historie
 * ohne den Speicher durch unbegrenztes Wachstum zu fragmentieren.
 */
export class AxiomaticEventBus extends EventEmitter {
  private static instance: AxiomaticEventBus;
  
  private readonly MAX_LEDGER_SIZE = 50000;
  private eventLedger: (IAxiomaticEvent | null)[];
  private writePointer: number = 0;
  private isFull: boolean = false;

  private constructor() {
    super();
    // Erhöhtes Limit für Listener, da viele Agenten (Jules) und Subsysteme gleichzeitig lauschen
    this.setMaxListeners(500);
    this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
  }

  /**
   * Singleton-Zugriff auf den EventBus
   */
  public static getInstance(): AxiomaticEventBus {
    if (!AxiomaticEventBus.instance) {
      AxiomaticEventBus.instance = new AxiomaticEventBus();
    }
    return AxiomaticEventBus.instance;
  }

  /**
   * Publiziert ein Event und speichert es im Ring-Buffer Ledger.
   * Entkoppelt von der StateReconstructionEngine, um zirkuläre Abhängigkeiten zu vermeiden.
   */
  public publish(event: IAxiomaticEvent): void {
    // Validierung der Event-Struktur
    if (!event.id || !event.type) {
      console.error('[AxiomaticEventBus] Invalid event rejected:', event);
      return;
    }

    // Ring-Buffer Logik: Event an aktueller Pointer-Position einfügen
    this.eventLedger[this.writePointer] = event;
    
    // Pointer inkrementieren und Modulo anwenden
    this.writePointer++;
    if (this.writePointer >= this.MAX_LEDGER_SIZE) {
      this.writePointer = 0;
      this.isFull = true;
    }

    // Standard Node.js EventEmitter Trigger für spezifische Typen
    this.emit(event.type, event);
    
    // Globaler Broadcast für generische Beobachter
    this.emit('*', event);
  }

  /**
   * Gibt die Event-Historie in chronologischer Reihenfolge zurück.
   * Rekonstruiert die Reihenfolge aus dem Ring-Buffer.
   */
  public getHistory(): IAxiomaticEvent[] {
    if (!this.isFull) {
      // Wenn der Buffer noch nie übergelaufen ist, einfach bis zum Pointer schneiden
      return this.eventLedger.slice(0, this.writePointer) as IAxiomaticEvent[];
    }

    // Wenn der Buffer voll ist: Teil ab Pointer bis Ende (älteste) 
    // gefolgt von Teil von 0 bis Pointer (neueste)
    const oldestToWrap = this.eventLedger.slice(this.writePointer) as IAxiomaticEvent[];
    const wrapToNewest = this.eventLedger.slice(0, this.writePointer) as IAxiomaticEvent[];
    
    return [...oldestToWrap, ...wrapToNewest];
  }

  /**
   * Filtert die Historie nach einem bestimmten Typ.
   */
  public getHistoryByType(type: string): IAxiomaticEvent[] {
    return this.getHistory().filter(e => e.type === type);
  }

  /**
   * Bereinigt den Ledger (Primär für Test-Szenarien oder Hard-Resets).
   */
  public clearLedger(): void {
    this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
    this.writePointer = 0;
    this.isFull = false;
  }

  /**
   * Gibt die aktuelle Auslastung des Ledgers zurück.
   */
  public getLedgerStats(): { size: number; max: number; full: boolean } {
    return {
      size: this.isFull ? this.MAX_LEDGER_SIZE : this.writePointer,
      max: this.MAX_LEDGER_SIZE,
      full: this.isFull
    };
  }
}

// Exportiere Singleton Instanz für direkten Zugriff
export const eventBus = AxiomaticEventBus.getInstance();