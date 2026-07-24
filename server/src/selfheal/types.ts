// ============================================================
// types.ts — Self-Healing System Types
// WASD / Areloria MMORPG
// Kein externe KI · Nur lokale Logik
// ============================================================

export type ErrorSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ErrorCategory =
  | "RUNTIME_EXCEPTION"     // Ungefangene Fehler zur Laufzeit
  | "SUBSYSTEM_CRASH"       // Ein Subsystem (z.B. NPCSystem) ist abgestürzt
  | "TICK_OVERRUN"          // WorldTick überschreitet 100ms Budget
  | "MEMORY_LEAK"           // Heap wächst unkontrolliert
  | "WS_DISCONNECT_FLOOD"   // Massenhafter WebSocket-Disconnect
  | "DATA_CORRUPTION"       // Ungültige Datenstrukturen erkannt
  | "FEATURE_REGRESSION"    // Ein bekanntes Feature gibt falsche Werte zurück
  | "NULL_REFERENCE"        // null/undefined Zugriff
  | "ASYNC_TIMEOUT"         // Promise hängt zu lange
  | "UNKNOWN";

export interface ErrorEvent {
  id: string;
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  subsystem: string;          // z.B. "NPCSystem", "CombatSystem", "WorldTick"
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  featureFlags?: string[];    // Welche Features waren aktiv
}

export interface HealingAction {
  id: string;
  errorId: string;
  timestamp: number;
  strategy: string;
  subsystem: string;
  description: string;
  featurePreservation: string[];  // Was NICHT angetastet wurde
  success: boolean;
  rollbackAvailable: boolean;
  durationMs: number;
}

export interface SubsystemHealth {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "CRASHED" | "RECOVERING";
  lastHealthyAt: number;
  errorCount: number;
  consecutiveErrors: number;
  restartCount: number;
  featureIntact: boolean;
}

export interface SystemSnapshot {
  timestamp: number;
  subsystems: Record<string, SubsystemHealth>;
  heapUsedMB: number;
  activeConnections: number;
  tickDurationAvgMs: number;
  totalErrorsSinceStart: number;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  subsystem: string;
  description: string;
  priority: "CORE" | "HIGH" | "MEDIUM" | "LOW";
  isProtected: boolean;       // Darf NIEMALS deaktiviert werden
  healthCheck?: () => boolean; // Optionale Prüffunktion
}

export interface HealingContext {
  subsystemHealth: Record<string, SubsystemHealth>;
  featureRegistry: Map<string, FeatureDefinition>;
  snapshot: SystemSnapshot;
  errorHistory: ErrorEvent[];
}

export interface HealingResult {
  success: boolean;
  description: string;
  featuresTouched: string[];   // Nur dokumentiert, NICHT deaktiviert
  requiresRestart: boolean;
  rollbackFn?: () => void;
}
