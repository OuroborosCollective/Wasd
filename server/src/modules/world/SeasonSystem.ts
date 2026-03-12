export class SeasonSystem {
  private seasons = ["spring", "summer", "autumn", "winter"] as const;

  getSeason(tick: number) {
    // Each season lasts 10,000 ticks
    const index = Math.floor(tick / 10000) % this.seasons.length;
    return this.seasons[index];
  }

  getModifier(season: string) {
    switch(season) {
      case 'winter': return { speed: 0.8, growth: 0.5 };
      case 'summer': return { speed: 1.1, growth: 1.2 };
      default: return { speed: 1.0, growth: 1.0 };
    }
  }
}
