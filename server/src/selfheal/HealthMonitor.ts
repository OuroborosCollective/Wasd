// ============================================================
// HealthMonitor.ts
// Überwacht die Systemressourcen und den Status der Subsysteme.
// ============================================================

import { SystemSnapshot, SubsystemHealth } from "./types.js";

export class HealthMonitor {
  private subsystems: Map<string, SubsystemHealth> = new Map();
  private errorCountSinceStart: number = 0;

  constructor() {}

  public updateSubsystemHealth(name: string, status: SubsystemHealth["status"], isError: boolean = false): void {
    const current = this.subsystems.get(name) || {
      name,
      status: "HEALTHY",
      lastHealthyAt: Date.now(),
      errorCount: 0,
      consecutiveErrors: 0,
      restartCount: 0,
      featureIntact: true
    };

    current.status = status;
    if (status === "HEALTHY") {
      current.lastHealthyAt = Date.now();
      current.consecutiveErrors = 0;
    }

    if (isError) {
      current.errorCount++;
      current.consecutiveErrors++;
      this.errorCountSinceStart++;
    }

    this.subsystems.set(name, current);
  }

  public getSnapshot(): SystemSnapshot {
    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    
    return {
      timestamp: Date.now(),
      subsystems: Object.fromEntries(this.subsystems),
      heapUsedMB: Math.round(heapUsed),
      activeConnections: 0, // Müsste vom WS-Server kommen
      tickDurationAvgMs: 0, // Müsste vom WorldTick kommen
      totalErrorsSinceStart: this.errorCountSinceStart
    };
  }

  public getSubsystemHealth(name: string): SubsystemHealth | undefined {
    return this.subsystems.get(name);
  }

  public getAllSubsystemHealth(): Record<string, SubsystemHealth> {
    return Object.fromEntries(this.subsystems);
  }
}
