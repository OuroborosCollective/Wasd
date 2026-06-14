import { GameDataStorageProvider } from '../content/GameDataStorageProvider';
import { FamilyHouseRegistry, NPCLineageManager, type LineageBirthEvent } from './FamilyHouseRegistry';
import {
  NPC_LINEAGE_GAME_DATA_PATH,
  NPC_LINEAGE_JOURNAL_GENESIS_HASH,
  NpcLineageGameDataWriter,
  readLineageJournalRecords,
  type LineageJournalRecord,
  type NpcLineageStorageProvider,
} from './LineageGameDataWriter';

export interface NpcLineageReplayResult {
  readonly target: string;
  readonly eventsRead: number;
  readonly lineagesReplayed: number;
  readonly journalHash: string;
}

export interface NpcLineageRuntimeOptions {
  readonly registry?: FamilyHouseRegistry;
  readonly storageProvider?: NpcLineageStorageProvider;
  readonly target?: string;
  readonly replay?: boolean;
}

export interface NpcLineageRuntime {
  readonly registry: FamilyHouseRegistry;
  readonly manager: NPCLineageManager;
  readonly writer: NpcLineageGameDataWriter;
  readonly storageProvider: NpcLineageStorageProvider;
  readonly replayResult: NpcLineageReplayResult;
}

function toBirthEvents(records: readonly LineageJournalRecord[]): LineageBirthEvent[] {
  return records.map((record) => ({
    eventHash: record.eventHash,
    lineageId: record.lineageId,
    lineageHash: record.lineageHash,
    parentLineageHashes: [...record.parentLineageHashes],
    houseId: record.houseId,
    settlementId: record.settlementId,
    birthTick: record.birthTick,
    pairEligibilityHash: record.pairEligibilityHash,
    pressureAtDecision: { ...record.pressureAtDecision },
    cause: record.cause,
    nodeSnapshot: {
      ...record.nodeSnapshot,
      parentLineageHashes: [...record.nodeSnapshot.parentLineageHashes],
      stats: { ...record.nodeSnapshot.stats },
      traits: [...record.nodeSnapshot.traits],
    },
  }));
}

export function replayNpcLineageRuntime(
  registry: FamilyHouseRegistry,
  storageProvider: NpcLineageStorageProvider,
  target: string = NPC_LINEAGE_GAME_DATA_PATH
): NpcLineageReplayResult {
  const records = readLineageJournalRecords(storageProvider, target);
  const events = toBirthEvents(records);
  registry.replayBirthEvents(events);
  return Object.freeze({
    target,
    eventsRead: records.length,
    lineagesReplayed: events.length,
    journalHash: records.at(-1)?.journalHash ?? NPC_LINEAGE_JOURNAL_GENESIS_HASH,
  });
}

export function createNpcLineageRuntime(options: NpcLineageRuntimeOptions = {}): NpcLineageRuntime {
  const registry = options.registry ?? new FamilyHouseRegistry();
  const storageProvider = options.storageProvider ?? new GameDataStorageProvider();
  const target = options.target ?? NPC_LINEAGE_GAME_DATA_PATH;
  const writer = new NpcLineageGameDataWriter(storageProvider, target);
  const replayResult = options.replay === false
    ? Object.freeze({ target, eventsRead: 0, lineagesReplayed: 0, journalHash: NPC_LINEAGE_JOURNAL_GENESIS_HASH })
    : replayNpcLineageRuntime(registry, storageProvider, target);
  const manager = new NPCLineageManager(registry, writer);

  return Object.freeze({ registry, manager, writer, storageProvider, replayResult });
}
