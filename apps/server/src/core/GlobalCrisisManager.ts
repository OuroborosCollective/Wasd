import { EventEmitter } from 'node:events';
import { CrisisLevel } from '../types/CrisisLevel.js';
import { Logger } from '../utils/Logger.js';
import { MetricsCollector } from './MetricsCollector.js';

export interface CrisisEvent {
    id: string;
    level: CrisisLevel;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export class GlobalCrisisManager extends EventEmitter {
    private static instance: GlobalCrisisManager;
    private logger: Logger;
    private metrics: MetricsCollector;
    private activeCrises: Map<string, CrisisEvent>;

    private constructor() {
        super();
        this.logger = new Logger('GlobalCrisisManager');
        this.metrics = MetricsCollector.getInstance();
        this.activeCrises = new Map();
    }

    public static getInstance(): GlobalCrisisManager {
        if (!GlobalCrisisManager.instance) {
            GlobalCrisisManager.instance = new GlobalCrisisManager();
        }
        return GlobalCrisisManager.instance;
    }

    public reportCrisis(level: CrisisLevel, message: string, metadata?: Record<string, unknown>): string {
        const id = crypto.randomUUID();
        const event: CrisisEvent = {
            id,
            level,
            message,
            timestamp: Date.now(),
            metadata
        };

        this.activeCrises.set(id, event);
        this.logger.error(`[CRISIS] [${level.toUpperCase()}] ${message}`, { id, metadata });
        
        this.metrics.increment('crisis_count', { level });
        this.emit('crisis_occurred', event);

        return id;
    }

    public resolveCrisis(id: string): boolean {
        const crisis = this.activeCrises.get(id);
        if (!crisis) {
            this.logger.warn(`Attempted to resolve non-existent crisis: ${id}`);
            return false;
        }

        this.activeCrises.delete(id);
        this.logger.info(`Crisis resolved: ${id}`);
        this.emit('crisis_resolved', crisis);
        
        return true;
    }

    public getActiveCrises(): CrisisEvent[] {
        return Array.from(this.activeCrises.values());
    }

    public isSystemCritical(): boolean {
        return Array.from(this.activeCrises.values()).some(c => c.level === CrisisLevel.CRITICAL);
    }
}