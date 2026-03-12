export class SeasonSystem {
  private seasons = ["spring", "summer", "autumn", "winter"] as const;
  getSeason(tick:number){
    return this.seasons[tick % this.seasons.length];
  }
}