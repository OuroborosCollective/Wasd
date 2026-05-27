import { WeatherResonance } from '../modules/weather/WeatherResonance.js';

export interface AREPayload {
    timestamp: number;
    resonance: number;
    tickRate: number;
    entities: any[];
}

export class PayloadFactory {
    private weatherResonance: WeatherResonance;
    private tick = 0;
    private readonly tickRate = 10;

    constructor(weatherResonance: WeatherResonance) {
        this.weatherResonance = weatherResonance;
    }

    /**
     * Erstellt das AREPayload für den aktuellen Tick-Zyklus.
     * Der resonance-Wert wird mit einer Frequenz von 10Hz aus dem WeatherResonance-Modul injiziert.
     * 
     * @param entities Die Liste der aktuell zu übermittelnden Entitäten.
     * @returns Das vollständige AREPayload-Objekt für den Client-Versand.
     */
    public createAREPayload(entities: any[]): AREPayload {
        this.tick += 1;
        return {
            timestamp: this.tick * 100,
            resonance: this.weatherResonance.calculateCurrentResonance(),
            tickRate: this.tickRate,
            entities: entities
        };
    }
}
