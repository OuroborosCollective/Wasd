export interface AREPayload {
    resonance: number;
    timestamp: number;
    intensity?: number;
}

/**
 * WeatherShaderController
 * Verwaltet die Synchronisation zwischen globalen ARE-Resonanzwerten 
 * und den Shader-Uniforms für prozedurale Biome-Animationen.
 */
export class WeatherShaderController {
    private static instance: WeatherShaderController;
    private resonance: number = 1.0;
    private phaseAccumulator: number = 0;

    private constructor() {}

    public static getInstance(): WeatherShaderController {
        if (!WeatherShaderController.instance) {
            WeatherShaderController.instance = new WeatherShaderController();
        }
        return WeatherShaderController.instance;
    }

    /**
     * Extrahiert die Resonanz aus dem Payload für die visuelle Synchronisation.
     */
    public updateFromPayload(payload: AREPayload): void {
        if (payload && typeof payload.resonance === 'number') {
            this.resonance = payload.resonance;
        }
    }

    /**
     * Aktualisiert die Uniform-Werte eines Materials basierend auf dem globalen Takt.
     * @param uniforms Das Uniform-Objekt des Renderers/Materials.
     * @param deltaTime Zeitdifferenz seit dem letzten Frame in Sekunden.
     */
    public updateUniforms(uniforms: Record<string, { value: any }>, deltaTime: number): void {
        if (!uniforms) return;

        // Erhöhe die Phase basierend auf der Resonanz (Globaler Takt)
        this.phaseAccumulator += deltaTime * this.resonance;

        // Grundlegende Resonanz-Stärke
        if (uniforms['uResonance']) {
            uniforms['uResonance'].value = this.resonance;
        }

        // Akkumulierte Zeitphase für kontinuierliche Bewegungen
        if (uniforms['uGlobalTime']) {
            uniforms['uGlobalTime'].value = this.phaseAccumulator;
        }

        // Wind-Biegungs-Koeffizient (z.B. für Gras/Blätter)
        if (uniforms['uWindBending']) {
            uniforms['uWindBending'].value = Math.sin(this.phaseAccumulator) * this.resonance;
        }

        // Wellen-Oszillation (z.B. für Wasserflächen)
        if (uniforms['uWaveFrequency']) {
            uniforms['uWaveFrequency'].value = Math.cos(this.phaseAccumulator * 0.7) * this.resonance;
        }

        // Biome-Animations-Geschwindigkeit
        if (uniforms['uAnimationSpeed']) {
            uniforms['uAnimationSpeed'].value = this.resonance;
        }
    }

    public getResonance(): number {
        return this.resonance;
    }

    public getPhase(): number {
        return this.phaseAccumulator;
    }
}