export class AudioEngine {
    private context: AudioContext;
    private mediaElement: HTMLAudioElement;
    private sourceNode: MediaElementAudioSourceNode;
    private lowPassFilter: BiquadFilterNode;

    constructor() {
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.mediaElement = new Audio();
        
        // Native Eigenschaft um Tonhöhenverschiebung bei Geschwindigkeitsänderung zu verhindern
        if ('preservesPitch' in this.mediaElement) {
            (this.mediaElement as any).preservesPitch = true;
        }

        this.lowPassFilter = this.context.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.setValueAtTime(20000, this.context.currentTime);

        this.sourceNode = this.context.createMediaElementSource(this.mediaElement);
        this.sourceNode.connect(this.lowPassFilter);
        this.lowPassFilter.connect(this.context.destination);
    }

    /**
     * Lädt eine Audioquelle
     */
    public setSource(url: string): void {
        this.mediaElement.src = url;
        this.mediaElement.crossOrigin = "anonymous";
        this.mediaElement.load();
    }

    /**
     * Startet die Wiedergabe
     */
    public async play(): Promise<void> {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
        return this.mediaElement.play();
    }

    /**
     * Stoppt die Wiedergabe
     */
    public pause(): void {
        this.mediaElement.pause();
    }

    /**
     * Setzt die Abspielgeschwindigkeit ohne die Tonhöhe zu beeinflussen
     * @param rate Faktor der Geschwindigkeit (1.0 = normal)
     */
    public setPlaybackRate(rate: number): void {
        this.mediaElement.playbackRate = rate;
    }

    /**
     * Steuert die Cutoff-Frequenz des Low-Pass-Filters
     * @param frequency Frequenz in Hz (20 bis 22050)
     */
    public setFilterCutoff(frequency: number): void {
        const clampedFrequency = Math.max(20, Math.min(frequency, 22050));
        // Weicher Übergang zur Vermeidung von Knackgeräuschen
        this.lowPassFilter.frequency.setTargetAtTime(clampedFrequency, this.context.currentTime, 0.01);
    }

    /**
     * Gibt den aktuellen AudioContext zurück
     */
    public getContext(): AudioContext {
        return this.context;
    }
}