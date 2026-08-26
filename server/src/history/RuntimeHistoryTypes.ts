export type RuntimeHistorySource = "economy_sell" | "trade_transfer" | "market_snapshot" | "quest_delta";

export interface RuntimeHistoryEntry {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly tick: number;
  readonly source: RuntimeHistorySource;
  readonly actorId: string;
  readonly subjectId: string;
  readonly chunkKey: string;
  readonly payloadHash: string;
  readonly entryHash: string;
}

export interface RuntimeHistoryWriteInput {
  readonly tick: number;
  readonly source: RuntimeHistorySource;
  readonly actorId: string;
  readonly subjectId: string;
  readonly chunkKey?: string;
  readonly payload: unknown;
}
