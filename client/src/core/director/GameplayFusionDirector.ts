import { DeterminismEngine } from "../engine/DeterminismEngine";

/**
 * Resolved interfaces for missing modules to fix TS2307 and TS2664
 */
export interface Command {
    type: string;
    metadata?: any;
}

export interface InputStack {
    registerAbilityMetadata(skillId: string, metadata: any): void;
    setGlobalMultiplier(key: string, value: number): void;
    addInputFilter(filter: (cmd: Command) => Command): void;
    setLatencyBuffer(buffer: number): void;
}

export interface SciencePortal {
    getGlobalMetrics(): EvolutionMetrics;
}

/**
 * Interface augmentation for DeterminismEngine to resolve TS2339
 */
declare module "../engine/DeterminismEngine" {
    interface DeterminismEngine {
        dispatchGlobalStateChange(type: string, payload: any): void;
        getCurrentFrame(): number;
        getInputStack(): InputStack;
        setSimulationSpeed(speed: number): void;
    }
}

export interface EvolutionMetrics {
    tier: number;
    stability: number;
    output: number;
    resonance: number;
    researchProgress: number;
}

export interface SkillRequirement {
    minTier: number;
    minResonance: number;
    minOutput: number;
}

export class GameplayFusionDirector {
    private engine: DeterminismEngine;
    private sciencePortal: SciencePortal;
    private unlockedSkills: Set<string> = new Set();
    private currentTier: number = 1;
    
    private readonly SKILL_DATABASE: Record<string, SkillRequirement> = {
        "ImpactBuster": { minTier: 3, minResonance: 0.85, minOutput: 5000 },
        "QuantumSync": { minTier: 4, minResonance: 0.95, minOutput: 8500 },
        "NeuralOverload": { minTier: 2, minResonance: 0.50, minOutput: 2000 }
    };

    constructor(engine: DeterminismEngine, sciencePortal: SciencePortal) {
        this.engine = engine;
        this.sciencePortal = sciencePortal;
    }

    /**
     * Main update loop for the director
     * @param deltaTime Simulation time step
     */
    public update(deltaTime: number): void {
        if (!this.checkSystemIntegrity()) return;

        const metrics = this.sciencePortal.getGlobalMetrics();
        this.evaluateFactionEvolution(metrics);
        this.processSkillValidations(metrics);
        this.injectGlobalModifiers(metrics);
    }

    private evaluateFactionEvolution(metrics: EvolutionMetrics): void {
        if (metrics.tier > this.currentTier) {
            this.currentTier = metrics.tier;
            this.engine.dispatchGlobalStateChange("FACTION_EVOLUTION_UPGRADE", {
                newTier: this.currentTier,
                timestamp: this.engine.getCurrentFrame()
            });
        }
    }

    private processSkillValidations(metrics: EvolutionMetrics): void {
        for (const [skillId, req] of Object.entries(this.SKILL_DATABASE)) {
            if (this.unlockedSkills.has(skillId)) continue;

            if (
                metrics.tier >= req.minTier &&
                metrics.resonance >= req.minResonance &&
                metrics.output >= req.minOutput
            ) {
                this.unlockSkill(skillId);
            }
        }
    }

    private unlockSkill(skillId: string): void {
        this.unlockedSkills.add(skillId);
        this.engine.getInputStack().registerAbilityMetadata(skillId, {
            unlocked: true,
            frame: this.engine.getCurrentFrame()
        });
    }

    private injectGlobalModifiers(metrics: EvolutionMetrics): void {
        const stack: InputStack = this.engine.getInputStack();

        if (this.unlockedSkills.has("ImpactBuster")) {
            const impactForce = 1.0 + (metrics.resonance * 0.5);
            stack.setGlobalMultiplier("damage_kinetic", impactForce);
            stack.addInputFilter((cmd: Command) => {
                if (cmd.type === "HEAVY_ATTACK") {
                    const currentMetadata = cmd.metadata || {};
                    cmd.metadata = { 
                        ...currentMetadata, 
                        splashRadius: 2.5 * metrics.stability 
                    };
                }
                return cmd;
            });
        }

        // Stability-based network simulation adjustments
        if (metrics.stability < 0.3) {
            stack.setLatencyBuffer(Math.floor(8 * (1 - metrics.stability)));
        } else {
            stack.setLatencyBuffer(2);
        }

        // Tick-rate dynamic scaling based on faction output
        const tickRateAdjustment = 1.0 + (metrics.output / 20000);
        this.engine.setSimulationSpeed(Math.min(1.5, tickRateAdjustment));
    }

    public getActiveSkillSet(): string[] {
        return Array.from(this.unlockedSkills);
    }

    public checkSystemIntegrity(): boolean {
        return (
            this.engine !== undefined && 
            this.sciencePortal !== undefined && 
            typeof this.engine.getInputStack === 'function'
        );
    }
}