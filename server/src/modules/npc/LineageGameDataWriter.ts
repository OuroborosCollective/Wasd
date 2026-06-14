import fs from "fs";

export interface NpcLineageSink {
  record(value: unknown): void;
}

export class NpcLineageGameDataWriter implements NpcLineageSink {
  constructor(private readonly relativePath = "npc/lineage-birth-events.json") {}

  record(value: unknown): void {
    void value;
    void this.relativePath;
    void fs;
  }
}
