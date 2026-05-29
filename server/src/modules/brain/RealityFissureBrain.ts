export interface FissureData {
  chunkId: string;
  paradoxCount: number;
  fissureSeverity: number; // 0.0 to 1.0
  lastAnalyzed: number;
}

export class RealityFissureBrain {
  private activeFissures: Map<string, FissureData> = new Map();
  private readonly PARADOX_THRESHOLD = 5; // e.g. 5 impossible movements/economy exploits in 10s

  /**
   * Records a logic paradox (impossible state) reported by the server engine.
   */
  public reportParadox(chunkId: string, paradoxType: string, now = 0) {
      const fissure = this.activeFissures.get(chunkId) || {
          chunkId,
          paradoxCount: 0,
          fissureSeverity: 0,
          lastAnalyzed: now
      };

      fissure.paradoxCount += 1;
      fissure.lastAnalyzed = now;

      // Calculate severity: exponential growth based on rapid paradoxes
      fissure.fissureSeverity = Math.min(1.0, fissure.paradoxCount / this.PARADOX_THRESHOLD);

      this.activeFissures.set(chunkId, fissure);
  }

  public getCriticalFissures(now = 0): FissureData[] {
      const critical: FissureData[] = [];
      const fissures = Array.from(this.activeFissures.entries()).sort(([leftChunkId], [rightChunkId]) =>
          leftChunkId < rightChunkId ? -1 : leftChunkId > rightChunkId ? 1 : 0
      );

      for (const [chunkId, fissure] of fissures) {
          // Decay severity over time (heal)
          const timeSinceActive = now - fissure.lastAnalyzed;
          if (timeSinceActive > 30000) { // 30 seconds of no paradoxes heals it slightly
              fissure.paradoxCount = Math.max(0, fissure.paradoxCount - 1);
              fissure.fissureSeverity = Math.min(1.0, fissure.paradoxCount / this.PARADOX_THRESHOLD);
              fissure.lastAnalyzed = now;
          }

          if (fissure.fissureSeverity > 0.8) {
              critical.push(fissure);
          }

          if (fissure.paradoxCount === 0) {
              this.activeFissures.delete(chunkId);
          }
      }

      return critical;
  }
}