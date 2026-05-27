import { WeatherResonance } from "../weather/WeatherResonance.js";

export interface AREPayload {
    id: string;
    timestamp: number;
    resonance: number;
}

export class AREPayloadManager {
    private static instance: AREPayloadManager;
    private payload: AREPayload;
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE_MS = 100;
    private tick = 0;

    private constructor() {
        this.payload = {
            id: "are_broadcast_node_01",
            timestamp: 0,
            resonance: 0
        };
        this.startPayloadTick();
    }

    public static getInstance(): AREPayloadManager {
        if (!AREPayloadManager.instance) {
            AREPayloadManager.instance = new AREPayloadManager();
        }
        return AREPayloadManager.instance;
    }

    private startPayloadTick(): void {
        this.updateInterval = setInterval(() => {
            this.refreshPayload();
        }, this.TICK_RATE_MS);
    }

    private refreshPayload(): void {
        this.tick += 1;
        this.payload = {
            ...this.payload,
            resonance: WeatherResonance.calculate(),
            timestamp: this.tick * this.TICK_RATE_MS
        };
    }

    public getPayload(): AREPayload {
        return this.payload;
    }

    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}
