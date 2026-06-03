import { integrityChecker, type AuditEntry } from './integrity-checker';
import { emitBackendWatchdogEvent, publishBackendLedgerEvent, advanceBackendWatchdogTick, getBackendWatchdogStatus } from './watchdog-runtime';

export interface IntegrityBridgeResult {
  ok: boolean;
  audit: AuditEntry[];
  watchdog: ReturnType<typeof getBackendWatchdogStatus>;
}

export class WatchdogIntegrityBridge {
  public async checkDatabase(dbClient: any): Promise<IntegrityBridgeResult> {
    const tick = advanceBackendWatchdogTick();
    const audit = await integrityChecker.checkDatabaseHealth(dbClient);
    const failed = audit.filter((entry) => entry.isCritical || entry.status !== 'SUCCESS');

    publishBackendLedgerEvent('watchdog.integrity.bridge.result', {
      tick,
      auditCount: audit.length,
      failedCount: failed.length,
      failed: failed.map((entry) => ({ model: entry.model, status: entry.status, category: entry.category })),
    }, 'watchdog-integrity-bridge', tick);

    if (failed.length > 0) {
      emitBackendWatchdogEvent('WATCHDOG_INTEGRITY_ATTENTION', {
        tick,
        failedCount: failed.length,
        failed: failed.map((entry) => ({ model: entry.model, status: entry.status, category: entry.category })),
      }, 'HIGH', 'WATCHDOG_INTEGRITY_BRIDGE', tick);
    }

    return {
      ok: failed.length === 0,
      audit,
      watchdog: getBackendWatchdogStatus(),
    };
  }
}

export const watchdogIntegrityBridge = new WatchdogIntegrityBridge();
