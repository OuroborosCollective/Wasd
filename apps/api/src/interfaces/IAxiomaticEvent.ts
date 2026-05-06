export enum AxiomSource {
  JULES_AI = 'JULES_AI',
  WATCHDOG = 'WATCHDOG',
  OPTIMIZER = 'OPTIMIZER',
  ORACLE = 'ORACLE',
  SYSTEM = 'SYSTEM',
  WORLD_ENGINE = 'WORLD_ENGINE',
  NETWORK_SYNC = 'NETWORK_SYNC'
}

/**
 * IAxiomaticEvent definiert die fundamentale Struktur für systemkritische Ereignisse
 * innerhalb des Areloria WASD Ökosystems. Es stellt sicher, dass alle Agenten (Jules),
 * Monitoring-Tools und Optimierungs-Services eine einheitliche Sprache sprechen.
 */
export interface IAxiomaticEvent {
  /**
   * Der spezifische Typ des Events (z.B. 'ENTITY_SPAWN', 'AI_DECISION', 'PERFORMANCE_CRITICAL').
   */
  type: string;

  /**
   * Die Ursprungskomponente, die das Event ausgelöst hat.
   */
  source: AxiomSource;

  /**
   * Die transportierten Daten des Events als Key-Value Pair.
   */
  payload: Record<string, any>;

  /**
   * Der präzise Zeitpunkt der Event-Erzeugung.
   */
  timestamp: Date;
}