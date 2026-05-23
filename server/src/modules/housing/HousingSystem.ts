export class HousingSystem {
  createHouse(ownerId: string, plotId: string) {
    return {
      ownerId,
      plotId,
      createdAt: Date.now(),
      upgrades: 0
    };
  }
}