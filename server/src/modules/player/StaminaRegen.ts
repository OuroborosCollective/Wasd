export class StaminaRegen {
  tick(player:any){
    player.stamina = Math.min(100, (player.stamina ?? 0) + 1);
    return player.stamina;
  }
}