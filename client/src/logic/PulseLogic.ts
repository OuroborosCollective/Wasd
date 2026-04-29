export class PulseLogic {
    public currentResonance: number = 0;
    public targetResonance: number = 0;
    public phaseShift: number = 0;
    private maxRate: number;

    constructor(maxRate: number = 200) {
        this.maxRate = maxRate;
    }

    public update(heartRate: number, ekgOffset: number): void {
        this.phaseShift = ekgOffset;
        this.targetResonance = heartRate / this.maxRate;
        
        const interpolationFactor = 0.1;
        this.currentResonance = this.lerp(this.currentResonance, this.targetResonance, interpolationFactor);
    }

    private lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * factor;
    }

    public getResonance(): number {
        return this.currentResonance;
    }

    public getPhaseShift(): number {
        return this.phaseShift;
    }

    public setMaxRate(rate: number): void {
        this.maxRate = rate;
    }
}