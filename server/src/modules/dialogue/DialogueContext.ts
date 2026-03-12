export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}