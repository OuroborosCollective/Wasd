export class SeasonalEventBridge {
  eventForSeason(season: string) {
    const map: Record<string, string> = {
      spring: "harvest_bloom",
      summer: "heatwave_fair",
      autumn: "harvest_festival",
      winter: "long_night"
    };
    return map[season] || "unknown_season";
  }
}