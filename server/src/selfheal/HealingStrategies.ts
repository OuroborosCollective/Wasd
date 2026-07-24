// ============================================================
// HealingStrategies.ts
// Konkrete Reparatur-Logik für verschiedene Fehlertypen.
// ============================================================

import { ErrorEvent, HealingContext, HealingResult, SubsystemHealth } from "./types.js";

export interface IHealingStrategy {
  name: string;
  canHandle: (error: ErrorEvent, health: SubsystemHealth) => boolean;
  execute: (error: ErrorEvent, context: HealingContext) => Promise<HealingResult>;
}

export const RestartSubsystemStrategy: IHealingStrategy = {
  name: "RestartSubsystem",
  canHandle: (error, health) => health.status === "CRASHED" || health.consecutiveErrors > 5,
  execute: async (error, context) => {
    // In einer echten Umgebung würde hier das Subsystem neu initialisiert
    return {
      success: true,
      description: `Subsystem ${error.subsystem} wurde neu gestartet.`,
      featuresTouched: [error.subsystem],
      requiresRestart: false
    };
  }
};

export const ClearCacheStrategy: IHealingStrategy = {
  name: "ClearCache",
  canHandle: (error) => error.category === "MEMORY_LEAK" || error.category === "DATA_CORRUPTION",
  execute: async (error) => {
    return {
      success: true,
      description: `Caches für ${error.subsystem} wurden geleert, um Speicher freizugeben.`,
      featuresTouched: [error.subsystem],
      requiresRestart: false
    };
  }
};

export const ThrottleConnectionsStrategy: IHealingStrategy = {
  name: "ThrottleConnections",
  canHandle: (error) => error.category === "WS_DISCONNECT_FLOOD" || error.category === "TICK_OVERRUN",
  execute: async () => {
    return {
      success: true,
      description: "Eingehende Verbindungen wurden gedrosselt, um CPU-Last zu senken.",
      featuresTouched: ["Network"],
      requiresRestart: false
    };
  }
};

export const DefaultStrategies: IHealingStrategy[] = [
  RestartSubsystemStrategy,
  ClearCacheStrategy,
  ThrottleConnectionsStrategy
];
