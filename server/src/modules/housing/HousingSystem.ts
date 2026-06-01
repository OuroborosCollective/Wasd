export class HousingSystem {
  createHouse(ownerId: string, plotId: string) {
    return {
      ownerId,
      plotId,
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      upgrades: 0
    };
  }
}