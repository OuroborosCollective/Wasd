export class NPCTradeAI {
  // Helper method to decide what good to trade
  chooseTrade(npc:any, goods:string[]) {
    return {
      npcId: npc.id,
      good: goods[0] ?? null
    };
  }
}
