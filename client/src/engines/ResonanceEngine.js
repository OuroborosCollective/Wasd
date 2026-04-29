class ResonanceEngine {
    constructor() {
        this.engineTime = 0;
        this.lastTimestamp = performance.now();
        this.update = this.update.bind(this);
        requestAnimationFrame(this.update);
    }

    update(timestamp) {
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        this.engineTime += deltaTime;
        requestAnimationFrame(this.update);
    }

    getPhaseShiftedIntensity(phaseShift, resonance, aggression) {
        return (Math.sin(this.engineTime + phaseShift) * resonance) * (1.0 + Math.pow(aggression, 2) * 5.0);
    }

    getEngineTime() {
        return this.engineTime;
    }
}

export const resonanceEngine = new ResonanceEngine();