export class EngineTime {
    private static _instance: EngineTime;

    private _lastTime: number = 0;
    private _deltaTime: number = 0;
    private _elapsedTime: number = 0;
    private _timeScale: number = 1.0;
    private _frameCount: number = 0;
    private _maxDeltaTime: number = 0.1;

    private constructor() {}

    public static getInstance(): EngineTime {
        if (!EngineTime._instance) {
            EngineTime._instance = new EngineTime();
        }
        return EngineTime._instance;
    }

    /**
     * Aktualisiert die Zeitwerte. 
     * @param timestamp Der Zeitstempel von requestAnimationFrame in Millisekunden.
     */
    public update(timestamp: number): void {
        if (this._lastTime === 0) {
            this._lastTime = timestamp;
        }

        const actualDeltaMs = timestamp - this._lastTime;
        this._lastTime = timestamp;

        // Umwandlung in Sekunden und Anwendung der TimeScale
        let deltaSeconds = actualDeltaMs / 1000;
        
        // Deckelung des Delta-Werts, um Sprünge bei Hintergrund-Tabs oder Rucklern zu vermeiden
        if (deltaSeconds > this._maxDeltaTime) {
            deltaSeconds = this._maxDeltaTime;
        }

        this._deltaTime = deltaSeconds * this._timeScale;
        this._elapsedTime += this._deltaTime;
        this._frameCount++;
    }

    public get deltaTime(): number {
        return this._deltaTime;
    }

    public get elapsedTime(): number {
        return this._elapsedTime;
    }

    public get timeScale(): number {
        return this._timeScale;
    }

    public set timeScale(value: number) {
        this._timeScale = value;
    }

    public get frameCount(): number {
        return this._frameCount;
    }

    /**
     * Gibt die tatsächliche Systemzeit in Millisekunden zurück (hochauflösend).
     */
    public get now(): number {
        return performance.now();
    }
}