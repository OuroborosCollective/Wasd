Um die 10Hz-Tick-Synchronisation innerhalb der Arelorian-Engine sicherzustellen, muss die `WorldStateRegistry` den atomaren Austausch des Weltzustands (State-Swap) deterministisch und unter Berücksichtigung der Frame-Kausalität abwickeln.

Hier ist die Implementierung der `WorldStateRegistry` für `apps/api/src/services/WorldStateRegistry.ts`:

typescript
import { Injectable, Logger } from '@nestjs/common';
import { WorldState } from '@wasd/shared';

/**
 * WorldStateRegistry
 * 
 * Single Source of Truth (SSoT) für den deterministischen Weltzustand.
 * Verwaltet den State-Swap-Mechanismus für die 10Hz-Engine.
 * 
 * REGELN:
 * 1. Frame-Monotonie: Ein neuer State muss immer einen höheren Frame-Index haben.
 * 2. Unveränderlichkeit: Der State wird nach dem Commit als Read-Only behandelt.
 */
@Injectable()
export class WorldStateRegistry {
  private readonly logger = new Logger(WorldStateRegistry.name);
  
  // Interner Speicher für den aktuellsten validierten Zustand
  private currentState: WorldState | null = null;
  
  // Letzter erfolgreich kommitteter Frame zur Kausalitätsprüfung
  private lastCommittedFrame = -1;

  /**
   * Gibt den aktuellen globalen Zustand zurück.
   * Muss von Systemen genutzt werden, die ARE-Axiome berechnen.
   */
  public getCurrentState(): WorldState | null {
    return this.currentState;
  }

  /**
   * commitStateSwap
   * 
   * Vollzieht den atomaren Wechsel zum nächsten WorldState.
   * Implementiert die Synchronisations-Barriere für den 10Hz Tick.
   * 
   * @param newState Der berechnete und durch den ATO validierte neue Zustand.
   */
  public commitStateSwap(newState: WorldState): void {
    if (!newState) {
      this.logger.error('Null-State-Commit abgelehnt.');
      return;
    }

    const incomingFrame = newState.frame ?? 0;

    // DETERMINISMUS-CHECK: Frame-Integrität (Axiom: Zeit fließt vorwärts)
    if (incomingFrame <= this.lastCommittedFrame && this.lastCommittedFrame !== -1) {
      this.logger.warn(
        `Synchronisations-Konflikt: Eingehender Frame ${incomingFrame} ist nicht jünger als ${this.lastCommittedFrame}. Swap abgebrochen.`
      );
      return;
    }

    // KAPPA-KONFORMITÄT: Sicherstellung, dass Metriken vorhanden sind
    if (!newState.performanceMetrics) {
      newState.performanceMetrics = {
        lastTickDurationMs: 0,
        thresholdMs: 80
      };
    }

    // Atomarer Swap
    this.currentState = Object.freeze(newState);
    this.lastCommittedFrame = incomingFrame;

    // Debugging für High-Load Szenarien (Logging nur bei Abweichung vom 10Hz Ideal)
    if (newState.performanceMetrics.lastTickDurationMs > newState.performanceMetrics.thresholdMs) {
      this.logger.warn(
        `Tick-Budget Überschreitung in Frame ${incomingFrame}: ${newState.performanceMetrics.lastTickDurationMs}ms`
      );
    }
  }

  /**
   * Initialisiert die Registry beim Serverstart oder nach einem World-Reset.
   */
  public initializeState(initialState: WorldState): void {
    this.logger.log(`Initialisiere WorldStateRegistry. Start-Frame: ${initialState.frame}`);
    this.currentState = Object.freeze(initialState);
    this.lastCommittedFrame = initialState.frame ?? 0;
  }

  /**
   * Ermöglicht das Abrufen des aktuellen Frames ohne den gesamten State zu klonen.
   */
  public get currentFrame(): number {
    return this.lastCommittedFrame;
  }
}


### Spezifikations-Details:
1.  **Frame-Monotonie**: Die Methode prüft, ob `incomingFrame <= lastCommittedFrame`. Dies verhindert, dass durch asynchrone Race-Conditions oder ATO-Verzögerungen alte Zustände einen neueren Zustand überschreiben.
2.  **Object.freeze**: Der State wird eingefroren, um sicherzustellen, dass nachfolgende Services (z.B. Broadcast-Service) den Zustand nicht versehentlich mutieren (Stateless Determinism).
3.  **Performance-Tracking**: Die Registry überwacht das 80ms-Budget des 10Hz-Ticks (100ms Gesamtintervall minus Puffer) und loggt Warnungen, falls die Engine den Kappa-Standard unterschreitet.
4.  **NestJS Integration**: Nutzt `@Injectable` für die korrekte Dependency Injection in den `WorldTickOptimizationService`.