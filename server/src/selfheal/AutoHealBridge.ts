/**
 * AutoHealBridge.ts
 * Stable adapter to existing SelfHeal/AutoHeal system.
 * This class must never fatal crash.
 */

import type { AutoHealSignal, IAutoHealBridge } from "./AutoHeal.types.js";

/**
 * Stabiler Adapter zum bestehenden SelfHeal-/AutoHeal-System.
 *
 * Diese Klasse darf nie fatal crashen.
 * Wenn später SelfHealEngine, WatchdogEmitter oder EventBus vorhanden sind,
 * werden sie optional angeschlossen.
 */
export class AutoHealBridge implements IAutoHealBridge {
  constructor(
    private readonly sink?: {
      report?: (signal: AutoHealSignal) => Promise<void> | void;
      emit?: (type: string, payload: unknown) => Promise<void> | void;
      publish?: (type: string, payload: unknown) => Promise<void> | void;
    }
  ) {}

  public async report(signal: AutoHealSignal): Promise<void> {
    try {
      if (this.sink?.report) {
        await this.sink.report(signal);
        return;
      }

      if (this.sink?.emit) {
        await this.sink.emit("AUTOHEAL_SIGNAL", signal);
        return;
      }

      if (this.sink?.publish) {
        await this.sink.publish("AUTOHEAL_SIGNAL", signal);
        return;
      }

      const line = JSON.stringify({
        service: "AutoHealBridge",
        event: "AUTOHEAL_SIGNAL",
        ...signal,
        createdAt: Date.now(),
      });

      if (signal.severity === "critical" || signal.severity === "error") {
        console.error(line);
        return;
      }

      if (signal.severity === "warn") {
        console.warn(line);
        return;
      }

      console.log(line);
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "AutoHealBridge",
          event: "AUTOHEAL_REPORT_FAILED",
          error: error instanceof Error ? error.message : String(error),
          traceId: signal.traceId,
          createdAt: Date.now(),
        })
      );
    }
  }
}