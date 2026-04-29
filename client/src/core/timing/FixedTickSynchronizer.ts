export class FixedTickSynchronizer {
    private _tickRate: number;
    private _tickDuration: number;
    private _accumulator: number = 0;
    private _lastTime: number = 0;
    private _alpha: number = 0;
    private _maxAccumulator: number = 250;

    /**
     * Erstellt einen neuen FixedTickSynchronizer.
     * @param tickRate Die Ziel-Frequenz in Hertz (Standard: 60Hz).
     */
    constructor(tickRate: number = 60) {
        this._tickRate = tickRate;
        this._tickDuration = 1000 / tickRate;
    }

    /**
     * Setzt den Zeitstempel und den Akkumulator zurück.
     * @param currentTime Der aktuelle Zeitstempel (ms), standardmäßig performance.now().
     */
    public reset(currentTime: number = performance.now()): void {
        this._lastTime = currentTime;
        this._accumulator = 0;
        this._alpha = 0;
    }

    /**
     * Verarbeitet die verstrichene Zeit und führt Ticks aus, wenn genügend Zeit akkumuliert wurde.
     * @param currentTime Der aktuelle Zeitstempel vom Main Loop (ms).
     * @param tickAction Die Callback-Funktion, die pro fixem Tick ausgeführt wird.
     */
    public update(currentTime: number, tickAction: (fixedDelta: number) => void): void {
        if (this._lastTime === 0) {
            this._lastTime = currentTime;
        }

        let deltaTime = currentTime - this._lastTime;
        this._lastTime = currentTime;

        // "Spiral of Death" Prävention: Begrenzung des Akkumulators bei extremen Lags
        if (deltaTime > this._maxAccumulator) {
            deltaTime = this._tickDuration;
        }

        this._accumulator += deltaTime;

        // Ausführung der fixen Ticks
        while (this._accumulator >= this._tickDuration) {
            tickAction(this._tickDuration);
            this._accumulator -= this._tickDuration;
        }

        // Berechnung des Interpolationsfaktors für das Rendering zwischen zwei Ticks
        this._alpha = this._accumulator / this._tickDuration;
    }

    /**
     * Gibt den Interpolationsfaktor (0 bis 1) zurück.
     * Nützlich für Renderer, um Objekte zwischen zwei Physik-Ticks zu glätten.
     */
    public get interpolationFactor(): number {
        return this._alpha;
    }

    /**
     * Die Dauer eines einzelnen Ticks in Millisekunden.
     */
    public get tickDuration(): number {
        return this._tickDuration;
    }

    /**
     * Die aktuelle Tick-Rate in Hertz.
     */
    public get tickRate(): number {
        return this._tickRate;
    }

    /**
     * Ändert die Tick-Rate zur Laufzeit und berechnet die Intervalle neu.
     */
    public set tickRate(value: number) {
        this._tickRate = value;
        this._tickDuration = 1000 / value;
    }

    /**
     * Maximale Zeitspanne, die akkumuliert werden darf, bevor Frames gedroppt werden (ms).
     */
    public set maxAccumulator(value: number) {
        this._maxAccumulator = value;
    }
}