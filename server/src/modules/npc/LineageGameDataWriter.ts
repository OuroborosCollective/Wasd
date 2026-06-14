export interface NpcLineageSink {
  record(value: unknown): void;
}

export const NPC_LINEAGE_GAME_DATA_PATH = "npc/lineage-events.json";

export class NpcLineageGameDataWriter implements NpcLineageSink {
  record(value: unknown): void {
    void value;
  }
}
