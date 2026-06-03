import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveContentFile } from "../content/contentDataRoot.js";
import type { VoteBannerEntry, VoteVerificationMode } from "./voteTypes.js";
import { deepClone } from "../../utils/deepClone.js";

const DEFAULT_BANNER_FILE = "world/vote-banners.json";
const ALLOWED_VERIFY_MODES = new Set<VoteVerificationMode>([
  "api_poll",
  "callback_token",
]);

type UpsertBannerInput = Partial<VoteBannerEntry> & {
  internalId?: string;
  providerKey: string;
  displayName: string;
  bannerImage: string;
  targetUrl: string;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMode(value: unknown): VoteVerificationMode {
  const t = asNonEmptyString(value)?.toLowerCase() as VoteVerificationMode | undefined;
  return t && ALLOWED_VERIFY_MODES.has(t) ? t : "api_poll";
}

function normalizeUrl(value: unknown, fieldName: string): string {
  const raw = asNonEmptyString(value);
  if (!raw) throw new Error(`${fieldName} is required.`);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error(`${fieldName} must be http(s).`);
  }
  return parsed.toString();
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return deepClone(value) as Record<string, unknown>;
}

function normalizeBanner(raw: Partial<VoteBannerEntry>, now: number): VoteBannerEntry {
  const providerKey = asNonEmptyString(raw.providerKey);
  if (!providerKey) throw new Error("providerKey is required.");
  const displayName = asNonEmptyString(raw.displayName);
  if (!displayName) throw new Error("displayName is required.");
  const internalId = asNonEmptyString(raw.internalId) ?? `vote_${randomUUID()}`;

  return {
    internalId,
    providerKey,
    displayName,
    bannerImage: normalizeUrl(raw.bannerImage, "bannerImage"),
    targetUrl: normalizeUrl(raw.targetUrl, "targetUrl"),
    description: asNonEmptyString(raw.description) ?? undefined,
    isActive: raw.isActive !== false,
    sortOrder: Math.max(0, Math.floor(asFiniteNumber(raw.sortOrder, 0))),
    voteWindowHours: Math.max(1, asFiniteNumber(raw.voteWindowHours, 12)),
    cooldownHours: Math.max(1, asFiniteNumber(raw.cooldownHours, 24)),
    buffHours: Math.max(1, asFiniteNumber(raw.buffHours, 4)),
    verificationMode: normalizeMode(raw.verificationMode),
    providerConfig: normalizeRecord(raw.providerConfig),
    claimInstructions: asNonEmptyString(raw.claimInstructions) ?? undefined,
    metadata: normalizeRecord(raw.metadata),
    createdAt: Math.max(0, Math.floor(asFiniteNumber(raw.createdAt, now))),
    updatedAt: Math.max(0, Math.floor(asFiniteNumber(raw.updatedAt, now))),
  };
}

export class VoteBannerStore {
  private readonly filePath: string;
  private cache: VoteBannerEntry[] | null = null;

  constructor(filePath = resolveContentFile(DEFAULT_BANNER_FILE)) {
    this.filePath = filePath;
  }

  getFilePath(): string {
    return this.filePath;
  }

  listAll(): VoteBannerEntry[] {
    return [...this.load()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  listActive(): VoteBannerEntry[] {
    return this.listAll().filter((b) => b.isActive);
  }

  getById(internalId: string): VoteBannerEntry | null {
    const t = asNonEmptyString(internalId);
    if (!t) return null;
    return this.load().find((b) => b.internalId === t) ?? null;
  }

  upsert(input: UpsertBannerInput): VoteBannerEntry {
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const list = this.load();
    const incoming = normalizeBanner(input, now);
    const idx = list.findIndex((b) => b.internalId === incoming.internalId);
    if (idx >= 0) {
      const existing = list[idx]!;
      list[idx] = {
        ...incoming,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } else {
      list.push({
        ...incoming,
        createdAt: now,
        updatedAt: now,
      });
    }
    this.save(list);
    return this.getById(incoming.internalId)!;
  }

  delete(internalId: string): boolean {
    const t = asNonEmptyString(internalId);
    if (!t) return false;
    const list = this.load();
    const next = list.filter((b) => b.internalId !== t);
    if (next.length === list.length) return false;
    this.save(next);
    return true;
  }

  setOrder(idsInOrder: string[]): VoteBannerEntry[] {
    const norm = idsInOrder.map((id) => asNonEmptyString(id)).filter((v): v is string => Boolean(v));
    const seen = new Set(norm);
    const list = this.listAll();
    const byId = new Map(list.map((b) => [b.internalId, b]));
    const sorted: VoteBannerEntry[] = [];
    for (const id of norm) {
      const row = byId.get(id);
      if (row) sorted.push(row);
    }
    for (const row of list) {
      if (!seen.has(row.internalId)) sorted.push(row);
    }
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const reindexed = sorted.map((row, index) => ({
      ...row,
      sortOrder: index,
      updatedAt: now,
    }));
    this.save(reindexed);
    return this.listAll();
  }

  private load(): VoteBannerEntry[] {
    if (this.cache) return this.cache;
    const next = this.readFromDisk();
    this.cache = next;
    return next;
  }

  private readFromDisk(): VoteBannerEntry[] {
    if (!fs.existsSync(this.filePath)) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      if (!Array.isArray(raw)) return [];
      const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
      const normalized = raw
        .map((entry) => {
          try {
            return normalizeBanner(entry ?? {}, now);
          } catch {
            return null;
          }
        })
        .filter((row): row is VoteBannerEntry => Boolean(row))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row, index) => ({ ...row, sortOrder: index }));
      return normalized;
    } catch {
      return [];
    }
  }

  private save(next: VoteBannerEntry[]): void {
    const sorted = [...next]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row, index) => ({ ...row, sortOrder: index }));
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
    this.cache = sorted;
  }
}

