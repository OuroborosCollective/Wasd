/** Gameplay ConstructionScheduler integration surface. */
export const inventorySystem = {
  async hasItem(_playerId: string, _itemId: string, _amount: number): Promise<boolean> {
    return false;
  },
  async consumeItem(_playerId: string, _itemId: string, _amount: number): Promise<boolean> {
    return false;
  },
};
