import { EngineTime } from "../core/EngineTime";
import { CullingSystem } from "../systems/CullingSystem";

export interface ResonanceData {
    aggression: number;
    frequency: number;
    amplitude: number;
    position: { x: number; y: number; z: number };
}

export class AtmosphericResonanceBridge {
    private static instance: AtmosphericResonanceBridge;
    private currentIntensity: number = 0;
    private targetIntensity: number = 0;
    private readonly LERP_SPEED: number = 0.12;

    private activeResonances: Map<string, ResonanceData> = new Map();

    private constructor(private cullingSystem: CullingSystem) {}

    public static getInstance(cullingSystem: CullingSystem): AtmosphericResonanceBridge {
        if (!AtmosphericResonanceBridge.instance) {
            AtmosphericResonanceBridge.instance = new AtmosphericResonanceBridge(cullingSystem);
        }
        return AtmosphericResonanceBridge.instance;
    }

    public handleIncomingPayload(chunkId: string, payload: ResonanceData): void {
        this.activeResonances.set(chunkId, payload);
    }

    public update(): void {
        let aggregateAggression = 0;
        let activeCount = 0;

        this.activeResonances.forEach((data, chunkId) => {
            if (!this.cullingSystem.isChunkVisible(chunkId)) {
                return;
            }

            const pulse = Math.sin(EngineTime.getElapsedTime() * data.frequency);
            const peakIntensity = Math.pow(data.aggression, 2);
            
            aggregateAggression += peakIntensity * (0.5 + 0.5 * pulse);
            activeCount++;
        });

        this.targetIntensity = activeCount > 0 ? aggregateAggression / activeCount : 0;
        this.applyLerp();
    }

    private applyLerp(): void {
        const delta = this.targetIntensity - this.currentIntensity;
        if (Math.abs(delta) < 0.001) {
            this.currentIntensity = this.targetIntensity;
            return;
        }
        this.currentIntensity += delta * this.LERP_SPEED;
    }

    public getIntensity(): number {
        return this.currentIntensity;
    }

    public clearResonance(chunkId: string): void {
        this.activeResonances.delete(chunkId);
    }
}