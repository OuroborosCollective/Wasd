// @ARE-GUARD-EXEMPT: non-sim module
export class MarketExpansion {
  expand(city:any) {
    city.marketLevel = (city.marketLevel ?? 1) + 1;
    return city.marketLevel;
  }
}