import { WeatherResonance } from "../modules/weather/WeatherResonance.js";
import { deterministicNow } from "./determinism/AREDeterminism.js";

export interface AREPayload {
    timestamp: number;
    tick: number;
    resonance: number;
    data: any;
}

export class GameStateManager {
    private static instance: GameStateManager;
    private weatherResonance: WeatherResonance;
    private currentTick: number = 0;
    private tickRate: number = 60;
    private intervalId: NodeJS.Timeout | null = null;

    private constructor() {
        this.weatherResonance = new WeatherResonance();
    }

    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    public start(): void {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.processTick(), 1000 / this.tickRate);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private processTick(): void {
        this.currentTick++;
        
        // Berechnung des aktuellen Resonance-Werts über das Modul
        const resonanceValue = this.weatherResonance.calculateCurrentResonance();

        // Erstellung des AREPayloads
        const payload: AREPayload = {
            timestamp: deterministicNow(this.currentTick),
            tick: this.currentTick,
            resonance: resonanceValue,
            data: this.gatherGameState()
        };

        this.streamToClients(payload);
    }

    private gatherGameState(): any {
        // Logik zur Aggregation des restlichen Game-States
        return {};
    }

    private streamToClients(payload: AREPayload): void {
        // Serialisierung und Versand an alle verbundenen Sockets
        const buffer = Buffer.from(JSON.stringify(payload));
        this.broadcast(buffer);
    }

    private broadcast(data: Buffer): void {
        // Implementierung des Netzwerk-Broadcasting
    }

    public setTickRate(rate: number): void {
        this.tickRate = rate;
        this.stop();
        this.start();
    }
}
