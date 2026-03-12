export class EquipmentSystem {
  equip(player:any, slot:string, item:any) {
    if (!player.equipment) player.equipment = {};
    player.equipment[slot] = item;
    return player.equipment;
  }
}