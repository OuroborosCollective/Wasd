export class SeasonalGrowthBridge {
  affectGrowth(season: string, stage: number) {
    const modifier = season === "spring" ? 2 : season === "winter" ? -1 : 1;
    return Math.max(0, stage + modifier);
  }
}