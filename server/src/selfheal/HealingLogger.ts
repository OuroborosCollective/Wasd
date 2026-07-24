// ============================================================
// HealingLogger.ts
// Protokolliert alle Heilungsaktionen und Fehlerereignisse.
// ============================================================

import { ErrorEvent, HealingAction } from "./types.js";
import fs from "fs";
import path from "path";

export class HealingLogger {
  private logPath: string;

  constructor(basePath: string) {
    this.logPath = path.join(basePath, "logs/healing");
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  public logError(error: ErrorEvent): void {
    const entry = `[${new Date(error.timestamp).toISOString()}] [ERROR] [${error.severity}] [${error.subsystem}] ${error.message}\n`;
    fs.appendFileSync(path.join(this.logPath, "errors.log"), entry);
    console.error(`[SelfHealing] Error detected: ${error.message} in ${error.subsystem}`);
  }

  public logAction(action: HealingAction): void {
    const entry = `[${new Date(action.timestamp).toISOString()}] [ACTION] [${action.success ? "SUCCESS" : "FAILED"}] [${action.subsystem}] Strategy: ${action.strategy} - ${action.description}\n`;
    fs.appendFileSync(path.join(this.logPath, "actions.log"), entry);
    console.log(`[SelfHealing] Healing action: ${action.description} (${action.success ? "Success" : "Failed"})`);
  }
}
