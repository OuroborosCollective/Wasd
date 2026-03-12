export class EquipmentSystem {
  equip(player: any, slot: string, item: any) {
    if (!player.equipment) player.equipment = {};
    player.equipment[slot] = item;
    return player.equipment;
  }

  unequip(player: any, slot: string) {
    if (!player.equipment) player.equipment = {};
    const item = player.equipment[slot] || null;
    delete player.equipment[slot];
    return item;
  }
}