export interface NpcLineageSink {
  record(value: unknown): void;
}

export class NpcLineageGameDataWriter implements NpcLineageSink {
  record(value: unknown): void {
    void value;
  }
}
