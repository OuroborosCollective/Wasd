export class NPCTradeAI {
  decideTrade(npc: any, market: any) {
    return {
      npcId: npc.id,
      chosenMarket: market.id ?? "unknown",
      action: "sell"
    };
  }
}