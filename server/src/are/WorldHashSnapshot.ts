import crypto from "node:crypto";
import type { AREGuardPayload } from "./AREInvariantGuard.js";

export interface HashableEntity {
  id?: string;
  name?: string;
  position?: { x?: number; y?: number; z?: number };
  health?: number;
  maxHealth?: number;
  state?: string;
  role?: string;
  type?: string;
  [key: string]: unknown;
}

export interface WorldHashSnapshotInput {
  tick: number;
  payload: AREGuardPayload;
  players?: HashableEntity[];
  npcs?: HashableEntity[];
  loot?: HashableEntity[];
  chunkSize?: number;
}

export interface ChunkHashSnapshot {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  tick: number;
  hash: string;
  counts: { players: number; npcs: number; loot: number; total: number };
}

export interface WorldHashSnapshot {
  tick: number;
  payloadHash: string;
  worldHash: string;
  chunkSize: number;
  chunks: ChunkHashSnapshot[];
  /** Deterministic marker. This is intentionally not wall-clock time. */
  createdAtIso: string;
}

function stableRound(value: unknown): unknown {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 1000) / 1000;
  }
  return value;
}

export function canonicalize(value: unknown): unknown {
  const rounded = stableRound(value);
  if (rounded === null || typeof rounded !== "object") return rounded;
  if (Array.isArray(rounded)) return rounded.map(canonicalize);
  const input = rounded as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    const v = input[key];
    if (typeof v === "undefined" || typeof v === "function") continue;
    output[key] = canonicalize(v);
  }
  return output;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function entityKind(kind: "players" | "npcs" | "loot", entity: HashableEntity): HashableEntity & { __kind: string } {
  return { ...entity, __kind: kind };
}

function chunkKeyForEntity(entity: HashableEntity, chunkSize: number): string {
  const x = Number(entity.position?.x ?? 0);
  const y = Number(entity.position?.y ?? entity.position?.z ?? 0);
  const chunkX = Math.floor(x / chunkSize);
  const chunkY = Math.floor(y / chunkSize);
  return `${chunkX}:${chunkY}`;
}

function parseChunkKey(key: string): { chunkX: number; chunkY: number } {
  const [x, y] = key.split(":").map((part) => Number(part));
  return { chunkX: Number.isFinite(x) ? x : 0, chunkY: Number.isFinite(y) ? y : 0 };
}

export function createWorldHashSnapshot(input: WorldHashSnapshotInput): WorldHashSnapshot {
  const chunkSize = input.chunkSize ?? 64;
  const payload = canonicalize(input.payload);
  const payloadHash = sha256(payload);
  const buckets = new Map<string, { players: HashableEntity[]; npcs: HashableEntity[]; loot: HashableEntity[] }>();

  const add = (kind: "players" | "npcs" | "loot", entity: HashableEntity) => {
    const key = chunkKeyForEntity(entity, chunkSize);
    const bucket = buckets.get(key) ?? { players: [], npcs: [], loot: [] };
    bucket[kind].push(entityKind(kind, entity));
    buckets.set(key, bucket);
  };

  for (const entity of input.players ?? []) add("players", entity);
  for (const entity of input.npcs ?? []) add("npcs", entity);
  for (const entity of input.loot ?? []) add("loot", entity);

  const chunks: ChunkHashSnapshot[] = [];
  for (const [key, bucket] of buckets.entries()) {
    const { chunkX, chunkY } = parseChunkKey(key);
    const normalized = {
      chunkX,
      chunkY,
      chunkSize,
      tick: input.tick,
      payload,
      players: bucket.players.sort((a, b) => {
        const idA = String(a.id ?? "");
        const idB = String(b.id ?? "");
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      }),
      npcs: bucket.npcs.sort((a, b) => {
        const idA = String(a.id ?? "");
        const idB = String(b.id ?? "");
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      }),
      loot: bucket.loot.sort((a, b) => {
        const idA = String(a.id ?? "");
        const idB = String(b.id ?? "");
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      }),
    };
    chunks.push({
      chunkX,
      chunkY,
      chunkSize,
      tick: input.tick,
      hash: sha256(normalized),
      counts: {
        players: bucket.players.length,
        npcs: bucket.npcs.length,
        loot: bucket.loot.length,
        total: bucket.players.length + bucket.npcs.length + bucket.loot.length,
      },
    });
  }

  chunks.sort((a, b) => a.chunkX - b.chunkX || a.chunkY - b.chunkY);

  return {
    tick: input.tick,
    payloadHash,
    worldHash: sha256({ tick: input.tick, payloadHash, chunkSize, chunks }),
    chunkSize,
    chunks,
    createdAtIso: `deterministic-tick:${input.tick}`,
  };
}

export function compareWorldHashSnapshots(server: WorldHashSnapshot, portal?: Partial<WorldHashSnapshot> | null) {
  const portalWorldHash = portal?.worldHash ?? null;
  const portalChunks = new Map((portal?.chunks ?? []).map((chunk) => [`${chunk.chunkX}:${chunk.chunkY}`, chunk.hash]));
  const mismatches = server.chunks
    .filter((chunk) => {
      const key = `${chunk.chunkX}:${chunk.chunkY}`;
      return portalChunks.has(key) && portalChunks.get(key) !== chunk.hash;
    })
    .map((chunk) => ({ chunkX: chunk.chunkX, chunkY: chunk.chunkY, serverHash: chunk.hash, portalHash: portalChunks.get(`${chunk.chunkX}:${chunk.chunkY}`) }));
  return {
    ok: Boolean(portalWorldHash && portalWorldHash === server.worldHash) && mismatches.length === 0,
    serverWorldHash: server.worldHash,
    portalWorldHash,
    mismatches,
    missingPortalChunks: server.chunks.filter((chunk) => !portalChunks.has(`${chunk.chunkX}:${chunk.chunkY}`)).map((chunk) => ({ chunkX: chunk.chunkX, chunkY: chunk.chunkY })),
  };
}
