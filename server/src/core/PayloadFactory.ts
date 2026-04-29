import { WeatherResonance } from './WeatherResonance';

export interface AREPayload {
    timestamp: number;
    resonance: number;
    tickRate: number;
    entities: any[];
}

export class PayloadFactory {
    private weatherResonance: WeatherResonance;

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
        return {
            timestamp: Date.now(),
            resonance: this.weatherResonance.calculateCurrentResonance(),
            tickRate: 10,
            entities: entities
        };
    }
}