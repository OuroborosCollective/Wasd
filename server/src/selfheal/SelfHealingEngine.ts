// ============================================================
// SelfHealingEngine.ts
// Haupt-Orchestrator des Self-Healing Systems.
// ============================================================

import { 
  ErrorEvent, 
  HealingAction, 
  HealingContext, 
  ErrorCategory, 
  ErrorSeverity 
} from "./types.js";
import { FeatureRegistry } from "./FeatureRegistry.js";
import { HealingLogger } from "./HealingLogger.js";
import { HealthMonitor } from "./HealthMonitor.js";
import { DefaultStrategies, IHealingStrategy } from "./HealingStrategies.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../");

export class SelfHealingEngine {
  private featureRegistry: FeatureRegistry;
  private logger: HealingLogger;
  private monitor: HealthMonitor;
  private strategies: IHealingStrategy[];
  private errorHistory: ErrorEvent[] = [];

  constructor() {
    this.featureRegistry = new FeatureRegistry();
    this.logger = new HealingLogger(ROOT);
    this.monitor = new HealthMonitor();
    this.strategies = [...DefaultStrategies];
    
    console.log("[SelfHealing] Engine initialisiert.");
  }

  /**
   * Meldet einen Fehler an das System und löst ggf. Heilung aus.
   */
  public async reportError(
    subsystem: string,
    message: string,
    category: ErrorCategory = "UNKNOWN",
    severity: ErrorSeverity = "MEDIUM",
    stack?: string
  ): Promise<void> {
    const error: ErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      category,
      severity,
      subsystem,
      message,
      stack
    };

    this.errorHistory.push(error);
    this.logger.logError(error);
    this.monitor.updateSubsystemHealth(subsystem, severity === "CRITICAL" ? "CRASHED" : "DEGRADED", true);

    // Heilung versuchen
    await this.attemptHealing(error);
  }

  /**
   * Sucht nach einer passenden Strategie und führt sie aus.
   */
  private async attemptHealing(error: ErrorEvent): Promise<void> {
    const health = this.monitor.getSubsystemHealth(error.subsystem);
    if (!health) return;

    const strategy = this.strategies.find(s => s.canHandle(error, health));
    
    if (strategy) {
      const startTime = Date.now();
      const context: HealingContext = {
        subsystemHealth: this.monitor.getAllSubsystemHealth(),
        featureRegistry: new Map(this.featureRegistry.getAllFeatures().map(f => [f.id, f])),
        snapshot: this.monitor.getSnapshot(),
        errorHistory: this.errorHistory
      };

      try {
        const result = await strategy.execute(error, context);
        
        const action: HealingAction = {
          id: `act_${Date.now()}`,
          errorId: error.id,
          timestamp: Date.now(),
          strategy: strategy.name,
          subsystem: error.subsystem,
          description: result.description,
          featurePreservation: this.featureRegistry.getAllFeatures()
            .filter(f => f.isProtected)
            .map(f => f.name),
          success: result.success,
          rollbackAvailable: !!result.rollbackFn,
          durationMs: Date.now() - startTime
        };

        this.logger.logAction(action);

        if (result.success) {
          this.monitor.updateSubsystemHealth(error.subsystem, "RECOVERING");
          // Nach einer gewissen Zeit auf HEALTHY setzen, wenn kein neuer Fehler auftritt
          setTimeout(() => {
            const currentHealth = this.monitor.getSubsystemHealth(error.subsystem);
            if (currentHealth && currentHealth.status === "RECOVERING") {
              this.monitor.updateSubsystemHealth(error.subsystem, "HEALTHY");
            }
          }, 30000);
        }
      } catch (err) {
        console.error(`[SelfHealing] Fehler bei Ausführung von Strategie ${strategy.name}:`, err);
      }
    } else {
      console.warn(`[SelfHealing] Keine passende Heilungsstrategie für ${error.subsystem} gefunden.`);
    }
  }

  public getMonitor(): HealthMonitor {
    return this.monitor;
  }
}

// Singleton-Export für einfache Nutzung im gesamten Server
export const selfHealing = new SelfHealingEngine();
