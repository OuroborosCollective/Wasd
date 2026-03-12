export class CivilizationRankings {
  rank(civs: any[]) {
    return [...civs].sort((a, b) => (b.population || 0) - (a.population || 0));
  }
}