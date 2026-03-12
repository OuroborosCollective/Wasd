export class NPCTradeAI {
  chooseTrade(npc:any, goods:string[]) {
    return {
      npcId: npc.id,
      good: goods[0] ?? null
    };
  }
}