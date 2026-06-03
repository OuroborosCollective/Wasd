import { createBackendAuditStamp, getBackendWatchdogTick, publishBackendLedgerEvent } from './watchdog-runtime';

export interface ViolationPattern {
    pattern: string;
    frequency: number;
    suggestion: string;
}

export class WatchdogLearning {
    private violations: any[] = [];
    private patterns: Map<string, ViolationPattern> = new Map();

    /**
     * Speichert eine Verletzung deterministisch und analysiert sie auf wiederkehrende Muster.
     */
    public record(violation: any): void {
        const enriched = {
            ...violation,
            tick: getBackendWatchdogTick(),
            auditStamp: createBackendAuditStamp(),
        };

        this.violations.push(enriched);
        publishBackendLedgerEvent('watchdog.learning.recorded', enriched, 'watchdog-learning');
        this.analyze(violation);
    }

    private analyze(violation: any): void {
        let patternKey = '';
        let suggestion = '';

        if (violation.type === 'SCHEMA_DRIFT') {
            patternKey = `DRIFT_${violation.payload.tableName}`;
            suggestion = 'Run the generated migration to sync database with models.';
        } else if (violation.type === 'TYPE_MISMATCH') {
            patternKey = `TYPE_${violation.payload.columnName}`;
            suggestion = 'Update the TypeScript interface or the database column type.';
        }

        if (patternKey) {
            const existing = this.patterns.get(patternKey) || { pattern: patternKey, frequency: 0, suggestion };
            existing.frequency++;
            this.patterns.set(patternKey, existing);
            publishBackendLedgerEvent('watchdog.learning.pattern', { pattern: patternKey, frequency: existing.frequency, suggestion }, 'watchdog-learning');
        }
    }

    public getInsights(): ViolationPattern[] {
        return Array.from(this.patterns.values());
    }

    public getRecentViolations(limit: number = 10): any[] {
        return this.violations.slice(-limit);
    }
}
