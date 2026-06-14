export interface NpcLineageRecordSink {
  recordNpcLineage(value: unknown): void;
}

export class NpcLineageGameDataWriter implements NpcLineageRecordSink {
  recordNpcLineage(_value: unknown): void {
    return;
  }
}
