import { createARESeed, stableHash32 } from '../../core/determinism/AREDeterminism';
import type { LineageBirthEvent, LineageNode, LineageStats, PopulationPressure } from './FamilyHouseRegistry';

export interface NpcLineageSink {
  record(value: LineageBirthEvent): void;
}

export interface NpcLineageStorageProvider {
  read(target: string): string | null;
  write(target: string, content: string): void;
}

export interface NpcLineageWriteResult {
  readonly target: string;
  readonly recordsWritten: number;
  readonly inserted: boolean;
  readonly journalHash: string;
}

export type LineageJournalRecord = LineageBirthEvent & {
  readonly previousJournalHash: string;
  readonly journalHash: string;
};

interface StoredLineageJournalRecord {
  readonly event: LineageBirthEvent;
  readonly previousJournalHash: string;
  readonly journalHash: string;
}

export const NPC_LINEAGE_GAME_DATA_PATH = ['npc', 'lineage-birth-events.json'].join('/');
export const NPC_LINEAGE_JOURNAL_GENESIS_HASH = 'GENESIS';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function stableStats(value: unknown): LineageStats {
  const record = isRecord(value) ? value : {};
  return {
    strength: numberValue(record.strength),
    agility: numberValue(record.agility),
    intelligence: numberValue(record.intelligence),
    stamina: numberValue(record.stamina),
    charisma: numberValue(record.charisma),
    luck: numberValue(record.luck),
  };
}

function stablePressure(value: unknown): PopulationPressure {
  const record = isRecord(value) ? value : {};
  const limitingFactor = stringValue(record.limitingFactor);
  return {
    pressure: numberValue(record.pressure),
    canSpawn: boolValue(record.canSpawn),
    limitingFactor: limitingFactor === 'capacity' || limitingFactor === 'food' || limitingFactor === 'housing' || limitingFactor === 'house_state'
      ? limitingFactor
      : null,
    maxPopulation: numberValue(record.maxPopulation),
  };
}

function stableNode(value: unknown): LineageNode {
  if (!isRecord(value)) throw new Error('npc_lineage_event_requires_node_snapshot');
  return {
    id: stringValue(value.id),
    lineageHash: stringValue(value.lineageHash),
    generation: numberValue(value.generation),
    birthTick: numberValue(value.birthTick),
    ...(value.deathTick === undefined ? {} : { deathTick: numberValue(value.deathTick) }),
    parentLineageHashes: Array.isArray(value.parentLineageHashes) ? value.parentLineageHashes.map((entry) => String(entry)).sort() : [],
    houseId: stringValue(value.houseId),
    settlementId: stringValue(value.settlementId),
    archetypeSeed: numberValue(value.archetypeSeed),
    stats: stableStats(value.stats),
    traits: Array.isArray(value.traits) ? value.traits.map((entry) => String(entry)).sort() : [],
  };
}

function legacyNodeFromEvent(value: Record<string, unknown>, parentLineageHashes: string[]): LineageNode {
  const lineageId = stringValue(value.lineageId);
  const lineageHash = stringValue(value.lineageHash);
  const birthTick = numberValue(value.birthTick);
  const seed = createARESeed(['legacy-lineage-node', lineageId, lineageHash, birthTick]);
  return {
    id: lineageId,
    lineageHash,
    generation: numberValue(value.generation),
    birthTick,
    parentLineageHashes,
    houseId: stringValue(value.houseId),
    settlementId: stringValue(value.settlementId),
    archetypeSeed: stableHash32(seed),
    stats: stableStats(value.stats),
    traits: Array.isArray(value.traits) ? value.traits.map((entry) => String(entry)).sort() : [],
  };
}

function stableRecord(value: unknown): LineageBirthEvent {
  if (!isRecord(value)) throw new Error('npc_lineage_event_must_be_object');
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
    pressureAtDecision: stablePressure(value.pressureAtDecision),
    cause: stringValue(value.cause) === 'founder' ? 'founder' : 'eligible_pair',
    nodeSnapshot: isRecord(value.nodeSnapshot) ? stableNode(value.nodeSnapshot) : legacyNodeFromEvent(value, parentLineageHashes),
  };
}

function recordKey(value: LineageBirthEvent): string {
  return value.eventHash || `${value.lineageId}:${value.birthTick}`;
}

function compareRecords(a: LineageBirthEvent, b: LineageBirthEvent): number {
  const tickDelta = a.birthTick - b.birthTick;
  if (tickDelta !== 0) return tickDelta;
  const settlementDelta = a.settlementId.localeCompare(b.settlementId);
  if (settlementDelta !== 0) return settlementDelta;
  return recordKey(a).localeCompare(recordKey(b));
}

function parseStoredRecords(raw: string | null): StoredLineageJournalRecord[] {
  if (!raw || raw.trim().length === 0) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('npc_lineage_event_store_must_be_array');
  return parsed.map((entry) => ({
    event: stableRecord(entry),
    previousJournalHash: isRecord(entry) ? stringValue(entry.previousJournalHash) : '',
    journalHash: isRecord(entry) ? stringValue(entry.journalHash) : '',
  }));
}

export function computeLineageJournalHash(event: LineageBirthEvent, previousJournalHash: string): string {
  const seed = createARESeed([
    'lineage-journal-chain',
    previousJournalHash,
    event.eventHash,
    event.lineageId,
    event.lineageHash,
    event.birthTick,
    event.houseId,
    event.settlementId,
    event.cause,
  ]);
  return stableHash32(seed).toString(16).padStart(8, '0');
}

export function buildLineageJournalRecords(events: readonly LineageBirthEvent[]): LineageJournalRecord[] {
  const deduped = new Map<string, LineageBirthEvent>();
  for (const event of events) deduped.set(recordKey(event), stableRecord(event));

  const records: LineageJournalRecord[] = [];
  let previousJournalHash = NPC_LINEAGE_JOURNAL_GENESIS_HASH;
  for (const event of Array.from(deduped.values()).sort(compareRecords)) {
    const journalHash = computeLineageJournalHash(event, previousJournalHash);
    records.push(Object.freeze({ ...event, previousJournalHash, journalHash }));
    previousJournalHash = journalHash;
  }
  return records;
}

export function readLineageJournalRecords(
  provider: NpcLineageStorageProvider,
  target: string = NPC_LINEAGE_GAME_DATA_PATH
): LineageJournalRecord[] {
  const stored = parseStoredRecords(provider.read(target));
  const rebuilt = buildLineageJournalRecords(stored.map((entry) => entry.event));

  for (let index = 0; index < stored.length; index += 1) {
    const expected = rebuilt[index];
    const actual = stored[index];
    if (actual.previousJournalHash && actual.previousJournalHash !== expected.previousJournalHash) {
      throw new Error(`npc_lineage_previous_journal_hash_mismatch:${index}`);
    }
    if (actual.journalHash && actual.journalHash !== expected.journalHash) {
      throw new Error(`npc_lineage_journal_hash_mismatch:${index}`);
    }
  }

  return rebuilt;
}

export class NpcLineageGameDataWriter implements NpcLineageSink {
  constructor(
    private readonly provider: NpcLineageStorageProvider,
    private readonly target = NPC_LINEAGE_GAME_DATA_PATH
  ) {}

  record(value: LineageBirthEvent): void {
    this.write(value);
  }

  write(value: LineageBirthEvent): NpcLineageWriteResult {
    const existing = readLineageJournalRecords(this.provider, this.target);
    const inserted = !existing.some((record) => recordKey(record) === recordKey(value));
    const records = buildLineageJournalRecords([...existing, value]);
    this.provider.write(this.target, JSON.stringify(records, null, 2) + '\n');

    return Object.freeze({
      target: this.target,
      recordsWritten: records.length,
      inserted,
      journalHash: records.at(-1)?.journalHash ?? NPC_LINEAGE_JOURNAL_GENESIS_HASH,
    });
  }
}
