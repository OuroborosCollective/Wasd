import { DeterminismEngine } from "../engine/DeterminismEngine";
import { SciencePortal } from "../systems/SciencePortal";
import { InputStack, Command } from "../engine/InputStack";

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

    public update(deltaTime: number): void {
        const metrics = this.sciencePortal.getGlobalMetrics() as EvolutionMetrics;
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
                    cmd.metadata = { ...cmd.metadata, splashRadius: 2.5 * metrics.stability };
                }
                return cmd;
            });
        }

        if (metrics.stability < 0.3) {
            stack.setLatencyBuffer(Math.floor(8 * (1 - metrics.stability)));
        } else {
            stack.setLatencyBuffer(2);
        }

        const tickRateAdjustment = 1.0 + (metrics.output / 20000);
        this.engine.setSimulationSpeed(Math.min(1.5, tickRateAdjustment));
    }

    public getActiveSkillSet(): string[] {
        return Array.from(this.unlockedSkills);
    }

    public checkSystemIntegrity(): boolean {
        return this.engine !== undefined && this.sciencePortal !== undefined;
    }
}