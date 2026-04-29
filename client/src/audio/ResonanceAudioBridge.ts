export class ResonanceAudioBridge {
    private tickCounter: number = 0;
    private readonly GRID_DIMENSION: number = 64;
    private readonly TOTAL_CELLS: number = 4096;

    constructor(
        private resonanceEngine: { getAggressionGrid(): number[] },
        private audioEngine: { setPlaybackRate(rate: number): void; setFilterCutoff(hz: number): void }
    ) {}

    public update(): void {
        this.tickCounter++;
        if (this.tickCounter % 20 === 0) {
            this.syncAudioParameters();
        }
    }

    private syncAudioParameters(): void {
        const grid = this.resonanceEngine.getAggressionGrid();
        let totalAggression = 0;

        for (let i = 0; i < grid.length; i++) {
            totalAggression += grid[i];
        }

        const intensity = Math.max(0, Math.min(1, totalAggression / this.TOTAL_CELLS));

        const minBPM = 80;
        const maxBPM = 160;
        const targetBPM = minBPM + (intensity * (maxBPM - minBPM));
        const playbackRate = targetBPM / 120;

        const minCutoff = 1000;
        const maxCutoff = 5000;
        const cutoff = minCutoff + (intensity * (maxCutoff - minCutoff));

        this.audioEngine.setPlaybackRate(playbackRate);
        this.audioEngine.setFilterCutoff(cutoff);
    }
}