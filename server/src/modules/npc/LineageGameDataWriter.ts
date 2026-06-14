import fs from "fs";

export interface NpcLineageSink {
  record(value: unknown): void;
}

export const npcLineageWriterFsReady = fs;
