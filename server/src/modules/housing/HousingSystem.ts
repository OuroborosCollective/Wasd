// @ARE-GUARD-EXEMPT: Creation/Claim timestamps; not world-state input.
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