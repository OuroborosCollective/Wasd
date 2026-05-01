import { Scene, Mesh, Material, Node, AbstractMesh } from "@babylonjs/core";
import { ScoringManager, ScoringTask, ScoreReport } from "./scoring-manager";

export interface OptimizationResult {
    originalScore: number;
    optimizedScore: number;
    appliedStrategies: string[];
}

export interface OptimizationStrategy {
    name: string;
    priority: number;
    evaluate(mesh: AbstractMesh): Promise<number>;
    apply(mesh: AbstractMesh): Promise<boolean>;
}

export class Optimizer {
    private scoringManager: ScoringManager;
    private strategies: OptimizationStrategy[] = [];

    constructor() {
        this.scoringManager = new ScoringManager();
        this.registerDefaultStrategies();
    }

    private registerDefaultStrategies(): void {
        this.strategies.push({
            name: "MeshMerging",
            priority: 10,
            evaluate: async (mesh) => {
                if (mesh instanceof Mesh && mesh.geometry) {
                    return mesh.getTotalVertices() > 0 ? 0.8 : 0.1;
                }
                return 0;
            },
            apply: async (mesh) => {
                // Implementation for mesh merging logic
                return true;
            }
        });

        this.strategies.push({
            name: "TextureCompression",
            priority: 5,
            evaluate: async (mesh) => {
                if (mesh.material) {
                    return 0.9;
                }
                return 0;
            },
            apply: async (mesh) => {
                // Implementation for texture compression logic
                return true;
            }
        });
    }

    public async optimize(scene: Scene): Promise<OptimizationResult> {
        const meshes = scene.meshes;
        const tasks: ScoringTask[] = meshes.map(mesh => ({
            id: mesh.uniqueId.toString(),
            data: mesh,
            weight: 1.0
        }));

        // Execute scoring in parallel via ScoringManager
        const initialReports: ScoreReport[] = await this.scoringManager.evaluateParallel(tasks);
        const totalInitialScore = initialReports.reduce((acc, report) => acc + report.score, 0);

        const appliedStrategies: string[] = [];

        // Parallel execution of optimization steps
        await Promise.all(meshes.map(async (mesh) => {
            const relevantStrategies = this.strategies
                .sort((a, b) => b.priority - a.priority);

            for (const strategy of relevantStrategies) {
                const score = await strategy.evaluate(mesh);
                if (score > 0.5) {
                    const success = await strategy.apply(mesh);
                    if (success && !appliedStrategies.includes(strategy.name)) {
                        appliedStrategies.push(strategy.name);
                    }
                }
            }
        }));

        // Re-evaluate after optimization
        const finalReports: ScoreReport[] = await this.scoringManager.evaluateParallel(tasks);
        const totalFinalScore = finalReports.reduce((acc, report) => acc + report.score, 0);

        return {
            originalScore: totalInitialScore,
            optimizedScore: totalFinalScore,
            appliedStrategies
        };
    }

    public addStrategy(strategy: OptimizationStrategy): void {
        this.strategies.push(strategy);
    }

    public async dispose(): Promise<void> {
        await this.scoringManager.dispose();
        this.strategies = [];
    }
}