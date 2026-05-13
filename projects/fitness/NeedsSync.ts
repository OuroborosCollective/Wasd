/**
 * NeedsSync.ts - Health-Decay App (Gamified Fitness)
 * 
 * Transfers Needs-Decay model to real vital data.
 * Implements strict decay (0.01 / tick) synchronized with wearable data like step counters.
 * If user tracker sends no updates, deterministic engine tick continues.
 * Wearable can validate chain-string locally without cloud.
 * 
 * Features:
 * - 0.01 decay per tick
 * - Wearable step count scaling
 * - Local chain validation
 * - Deterministic engine
 * - No cloud dependency
 */

import { EventEmitter } from 'events';

/** Vital data from wearable */
export interface VitalData {
    steps: number;
    heartRate: number;
    timestamp: number;
    weight: number;
    source: string;
}

/** Health needs */
export interface HealthNeeds {
    energy: number;    // 0-100
    hydration: number; // 0-100
    Nutrition: number;   // 0-100
    rest: number;    // 0-100
    social: number;  // 0-100
}

/** Needs state */
export interface NeedsState {
    needs: HealthNeeds;
    tickCount: number;
    lastUpdate: number;
    chain: string;
}

/** Chain string format */
export type ChainFormat = 'full' | 'compact';

/** Decay configuration */
export interface DecayConfig {
    baseDecay: number;        // 0.01 default
    activityMultiplier: number; // steps * weight
    minNeed: number;         // 0
    maxNeed: number;         // 100
    tickInterval: number;      // 1000ms (1 tick per second)
}

/** Default config */
const DEFAULT_CONFIG: DecayConfig = {
    baseDecay: 0.01,
    activityMultiplier: 0.0001,
    minNeed: 0,
    maxNeed: 100,
    tickInterval: 1000
};

/** Step weight factors */
export const STEP_WEIGHTS = {
    sedentary: 0.0,
    light: 0.00005,
    moderate: 0.0001,
    active: 0.0002,
    intense: 0.0003
};

/**
 * Calculate decay amount from steps.
 */
export function calculateDecayFromSteps(
    steps: number,
    decayBase: number = DEFAULT_CONFIG.baseDecay,
    weight: number = STEP_WEIGHTS.moderate
): number {
    const stepDecay = steps * weight;
    return Math.max(0, decayBase - stepDecay);
}

/**
 * Generate deterministic chain string.
 */
export function generateChain(
    state: NeedsState,
    format: ChainFormat = 'full'
): string {
    const { energy, hydration, Nutrition, rest, social } = state.needs;
    const tick = state.tickCount;
    const ts = state.lastUpdate;
    
    if (format === 'compact') {
        // Compact: e:xx|h:xx|n:xx|r:xx|s:xx|t:xxxxx
        return `e:${energy.toFixed(1)}|h:${hydration.toFixed(1)}|n:${Nutrition.toFixed(1)}|r:${rest.toFixed(1)}|s:${social.toFixed(1)}|t:${tick}`;
    }
    
    // Full JSON chain
    return JSON.stringify({
        needs: { energy, hydration, Nutrition, rest, social },
        tick,
        ts,
        hash: simpleHash(`${energy}${hydration}${Nutrition}${rest}${social}${tick}`)
    });
}

/**
 * Simple deterministic hash.
 */
function simpleHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/**
 * Parse chain string.
 */
export function parseChain(chain: string): NeedsState | null {
    try {
        if (chain.startsWith('{')) {
            // Full JSON format
            const parsed = JSON.parse(chain);
            return {
                needs: parsed.needs,
                tickCount: parsed.tick,
                lastUpdate: parsed.ts,
                chain
            };
        }
        
        // Compact format: e:xx|h:xx|n:xx|r:xx|s:xx|t:xxxxx
        const parts = chain.split('|');
        const values: number[] = [];
        
        for (const part of parts) {
            const [, value] = part.split(':');
            values.push(parseFloat(value));
        }
        
        return {
            needs: {
                energy: values[0],
                hydration: values[1],
                Nutrition: values[2],
                rest: values[3],
                social: values[4]
            },
            tickCount: values[5],
            lastUpdate: Date.now(),
            chain
        };
    } catch {
        return null;
    }
}

/**
 * VitalProcessor - Wearable data processor.
 */
export class VitalProcessor extends EventEmitter {
    private currentSteps: number = 0;
    private lastSteps: number = 0;
    private stepWeight: number = STEP_WEIGHTS.moderate;

    constructor(stepWeight: keyof typeof STEP_WEIGHTS = 'moderate') {
        super();
        this.stepWeight = STEP_WEIGHTS[stepWeight];
    }

    /**
     * Process vital data from wearable.
     */
    public processVital(data: VitalData): {
        decayModifier: number;
        stepsDelta: number;
        activityLevel: string;
    } {
        this.lastSteps = this.currentSteps;
        this.currentSteps = data.steps;
        
        const stepsDelta = this.currentSteps - this.lastSteps;
        const decayModifier = calculateDecayFromSteps(stepsDelta, 0.01, this.stepWeight);
        
        let activityLevel = 'sedentary';
        if (stepsDelta > 10000) activityLevel = 'intense';
        else if (stepsDelta > 5000) activityLevel = 'active';
        else if (stepsDelta > 2000) activityLevel = 'moderate';
        else if (stepsDelta > 500) activityLevel = 'light';
        
        this.emit('vital_processed', { stepsDelta, decayModifier, activityLevel });
        
        return { stepsDelta, decayModifier, activityLevel };
    }

    /**
     * Get steps delta.
     */
    public getStepsDelta(): number {
        return this.currentSteps - this.lastSteps;
    }

    /**
     * Get current steps.
     */
    public getCurrentSteps(): number {
        return this.currentSteps;
    }
}

/**
 * NeedsEngine - Main decay engine.
 */
export class NeedsEngine extends EventEmitter {
    private needs: HealthNeeds;
    private tickCount: number = 0;
    private config: DecayConfig;
    private vitals: VitalProcessor;
    private isRunning: boolean = false;
    private tickIntervalId: NodeJS.Timeout | null = null;
    private lastChain: string = '';

    constructor(config?: Partial<DecayConfig>, stepWeight?: keyof typeof STEP_WEIGHTS) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.needs = {
            energy: 100,
            hydration: 100,
            Nutrition: 100,
            rest: 100,
            social: 100
        };
        this.vitals = new VitalProcessor(stepWeight);
    }

    /**
     * Start the engine.
     */
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.tickCount = 0;
        
        this.tickIntervalId = setInterval(() => {
            this.tick();
        }, this.config.tickInterval);
        
        this.emit('started', this.tickCount);
    }

    /**
     * Stop the engine.
     */
    public stop(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
            this.tickIntervalId = null;
        }
        
        this.emit('stopped', this.tickCount);
    }

    /**
     * Process wearable update (no cloud needed).
     */
    public processWearable(vital: VitalData): void {
        const result = this.vitals.processVital(vital);
        
        // Apply to needs immediately
        this.applyActivity(result.decayModifier);
        this.emit('wearable_processed', result);
    }

    /**
     * Single tick - deterministic decay.
     */
    private tick(): void {
        this.tickCount++;
        
        // Apply base decay to all needs
        for (const key of Object.keys(this.needs) as Array<keyof HealthNeeds>) {
            this.needs[key] = Math.max(
                this.config.minNeed,
                this.needs[key] - this.config.baseDecay
            );
        }
        
        // Update chain
        this.lastChain = this.generateChain();
        
        this.emit('tick', {
            tickCount: this.tickCount,
            needs: { ...this.needs },
            chain: this.lastChain
        });
    }

    /**
     * Apply activity modifier.
     */
    private applyActivity(modifier: number): void {
        // Activity primarily restores energy and rest
        this.needs.energy = Math.min(
            this.config.maxNeed,
            this.needs.energy + modifier * 100
        );
        this.needs.rest = Math.min(
            this.config.maxNeed,
            this.needs.rest + modifier * 50
        );
    }

    /**
     * Generate current chain string.
     */
    public generateChain(): string {
        return generateChain({
            needs: { ...this.needs },
            tickCount: this.tickCount,
            lastUpdate: Date.now(),
            chain: ''
        }, 'compact');
    }

    /**
     * Validate chain locally (no cloud).
     */
    public validateChain(chain: string): boolean {
        const parsed = parseChain(chain);
        if (!parsed) return false;
        
        // Check if tick count is advancing
        if (parsed.tickCount < this.tickCount) {
            return false;
        }
        
        // Check if needs are within bounds
        const { needs } = parsed;
        for (const value of Object.values(needs)) {
            if (value < this.config.minNeed || value > this.config.maxNeed) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get current state.
     */
    public getState(): NeedsState {
        return {
            needs: { ...this.needs },
            tickCount: this.tickCount,
            lastUpdate: Date.now(),
            chain: this.lastChain
        };
    }

    /**
     * Get current needs.
     */
    public getNeeds(): HealthNeeds {
        return { ...this.needs };
    }

    /**
     * Get tick count.
     */
    public getTickCount(): number {
        return this.tickCount;
    }

    /**
     * Set need value.
     */
    public setNeed(need: keyof HealthNeeds, value: number): void {
        this.needs[need] = Math.max(
            this.config.minNeed,
            Math.min(this.config.maxNeed, value)
        );
        this.lastChain = this.generateChain();
    }

    /**
     * Check if running.
     */
    public isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Get vital processor.
     */
    public getVitals(): VitalProcessor {
        return this.vitals;
    }
}

/**
 * WearableSimulator - Simulates wearable data for testing.
 */
export class WearableSimulator extends EventEmitter {
    private steps: number = 0;
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private targetStepsPerMinute: number = 100;

    constructor(stepsPerMinute: number = 100) {
        super();
        this.targetStepsPerMinute = stepsPerMinute;
    }

    /**
     * Start simulation.
     */
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        this.intervalId = setInterval(() => {
            this.emit('data', this.generateData());
        }, 60000 / this.targetStepsPerMinute);
    }

    /**
     * Stop simulation.
     */
    public stop(): void {
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Generate vital data.
     */
    private generateData(): VitalData {
        this.steps += Math.floor(this.targetStepsPerMinute / 60);
        
        return {
            steps: this.steps,
            heartRate: 70 + Math.floor(Math.random() * 30),
            timestamp: Date.now(),
            weight: 1.0,
            source: 'simulator'
        };
    }

    /**
     * Get steps count.
     */
    public getSteps(): number {
        return this.steps;
    }

    /**
     * Reset.
     */
    public reset(): void {
        this.steps = 0;
    }
}

export default NeedsEngine;
export { VitalProcessor, VitalData, HealthNeeds, NeedsState, ChainFormat };
export { calculateDecayFromSteps, generateChain, parseChain };
export { DEFAULT_CONFIG, STEP_WEIGHTS };