export interface NpcLineageSink {
  record(value: unknown): void;
}

export interface NpcLineageStorageProvider {
  read(target: string): string | null;
  write(target: string, content: string): void;
}

export interface NpcLineageWriteResult {
  readonly target: string;
  readonly recordsWritten: number;
  readonly inserted: boolean;
}

export const NPC_LINEAGE_GAME_DATA_PATH = ["npc", "lineage-birth-events.json"].join("/");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function stableRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("npc_lineage_event_must_be_object");
  const pressureAtDecision = isRecord(value.pressureAtDecision) ? { ...value.pressureAtDecision } : {};
  const parentLineageHashes = Array.isArray(value.parentLineageHashes)
    ? value.parentLineageHashes.map((entry) => String(entry)).sort()
    : [];

  return {
    eventHash: stringValue(value.eventHash),
    lineageId: stringValue(value.lineageId),
    lineageHash: stringValue(value.lineageHash),
    parentLineageHashes,
    houseId: stringValue(value.houseId),
    settlementId: stringValue(value.settlementId),
    birthTick: numberValue(value.birthTick),
    pairEligibilityHash: stringValue(value.pairEligibilityHash),
    pressureAtDecision,
    cause: stringValue(value.cause),
  };
}

function recordKey(value: Record<string, unknown>): string {
  return stringValue(value.eventHash) || `${stringValue(value.lineageId)}:${numberValue(value.birthTick)}`;
}

function compareRecords(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const tickDelta = numberValue(a.birthTick) - numberValue(b.birthTick);
  if (tickDelta !== 0) return tickDelta;
  const settlementDelta = stringValue(a.settlementId).localeCompare(stringValue(b.settlementId));
  if (settlementDelta !== 0) return settlementDelta;
  return recordKey(a).localeCompare(recordKey(b));
}

function parseRecords(raw: string | null): Record<string, unknown>[] {
  if (!raw || raw.trim().length === 0) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("npc_lineage_event_store_must_be_array");
  return parsed.map(stableRecord);
}

export class NpcLineageGameDataWriter implements NpcLineageSink {
  constructor(
    private readonly provider: NpcLineageStorageProvider,
    private readonly target = NPC_LINEAGE_GAME_DATA_PATH
  ) {}

  record(value: unknown): void {
    this.write(value);
  }

  write(value: unknown): NpcLineageWriteResult {
    const next = stableRecord(value);
    const byKey = new Map<string, Record<string, unknown>>();
    for (const existing of parseRecords(this.provider.read(this.target))) {
      byKey.set(recordKey(existing), existing);
    }

    const key = recordKey(next);
    const inserted = !byKey.has(key);
    byKey.set(key, next);

    const records = Array.from(byKey.values()).sort(compareRecords);
    this.provider.write(this.target, JSON.stringify(records, null, 2) + "\n");

    return Object.freeze({ target: this.target, recordsWritten: records.length, inserted });
  }
}
