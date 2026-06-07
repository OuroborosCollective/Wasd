/**
 * AILocalLearningStore.ts
 * Deterministic local learning memory store for AI decisions.
 *
 * Guarantees:
 * - Bounded memory
 * - Stable insertion/update behavior
 * - Scope normalization
 * - Duplicate event replacement by id
 * - Deterministic summaries for AutoHeal, diagnostics and agents
 */

import type { AIActionType, AILearningEvent } from "./AIService.types.js";

export interface AILearningSummary {
  scope: string;
  total: number;
  byAction: Record<string, number>;
  byIntent: Record<string, number>;
  averageConfidence: number;
  averageSuccessScore: number;
  latest: AILearningEvent | null;
  topTags: Array<{ tag: string; count: number }>;
  updatedAt: number | null;
}

export interface AILocalLearningStoreSnapshot {
  maxEvents: number;
  totalEvents: number;
  scopes: string[];
  latest: AILearningEvent | null;
}

export interface IAILocalLearningStore {
  record(event: AILearningEvent): Promise<void>;
  list(scope: string, limit?: number): Promise<AILearningEvent[]>;
  summarize(scope: string): Promise<AILearningSummary>;
  snapshot?(): Promise<AILocalLearningStoreSnapshot>;
  clearScope?(scope: string): Promise<number>;
}

const DEFAULT_MAX_EVENTS = 10_000;
const MIN_MAX_EVENTS = 100;
const MAX_MAX_EVENTS = 250_000;
const MAX_LIST_LIMIT = 500;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeToken(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96);

  return normalized || fallback;
}

function normalizeEvent(event: AILearningEvent): AILearningEvent {
  const createdAt = Number.isFinite(event.createdAt)
    ? Math.max(0, Math.trunc(event.createdAt))
    : 0;

  const confidence = Number.isFinite(event.confidence)
    ? Math.max(0, Math.min(1, event.confidence))
    : 0;

  const successScore = Number.isFinite(event.successScore)
    ? Math.max(0, Math.min(1, event.successScore))
    : 0;

  return Object.freeze({
    ...event,
    id: normalizeToken(event.id, `learn-${event.inputHash}-${event.outputHash}`),
    agentId: normalizeToken(event.agentId, "ai-core"),
    memoryScope: normalizeToken(event.memoryScope, "default"),
    logicalIndex: clampInt(event.logicalIndex, 0, Number.MAX_SAFE_INTEGER),
    inputHash: String(event.inputHash ?? ""),
    outputHash: String(event.outputHash ?? ""),
    intent: normalizeToken(event.intent, "unknown"),
    action: event.action,
    confidence,
    successScore,
    tags: Array.from(
      new Set(
        (event.tags ?? [])
          .map((tag) => normalizeToken(tag, ""))
          .filter(Boolean)
      )
    ).sort(),
    createdAt,
    metadata: Object.freeze({ ...(event.metadata ?? {}) }),
  });
}

function createEmptySummary(scope: string): AILearningSummary {
  return {
    scope,
    total: 0,
    byAction: {},
    byIntent: {},
    averageConfidence: 0,
    averageSuccessScore: 0,
    latest: null,
    topTags: [],
    updatedAt: null,
  };
}

export class AILocalLearningStore implements IAILocalLearningStore {
  private readonly events: AILearningEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = DEFAULT_MAX_EVENTS) {
    this.maxEvents = clampInt(maxEvents, MIN_MAX_EVENTS, MAX_MAX_EVENTS);
  }

  public async record(event: AILearningEvent): Promise<void> {
    const normalized = normalizeEvent(event);
    const existingIndex = this.events.findIndex((entry) => entry.id === normalized.id);

    if (existingIndex >= 0) {
      this.events[existingIndex] = normalized;
    } else {
      this.events.push(normalized);
    }

    this.sortEvents();
    this.trimOldest();
  }

  public async list(scope: string, limit = 50): Promise<AILearningEvent[]> {
    const normalizedScope = normalizeToken(scope, "default");
    const safeLimit = clampInt(limit, 1, MAX_LIST_LIMIT);

    return this.events
      .filter((event) => event.memoryScope === normalizedScope)
      .slice(-safeLimit)
      .map((event) => Object.freeze({ ...event, metadata: { ...event.metadata } }));
  }

  public async summarize(scope: string): Promise<AILearningSummary> {
    const normalizedScope = normalizeToken(scope, "default");
    const scoped = this.events.filter((event) => event.memoryScope === normalizedScope);

    if (scoped.length === 0) {
      return createEmptySummary(normalizedScope);
    }

    const byAction: Record<string, number> = {};
    const byIntent: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let confidenceSum = 0;
    let successSum = 0;

    for (const event of scoped) {
      byAction[event.action] = (byAction[event.action] ?? 0) + 1;
      byIntent[event.intent] = (byIntent[event.intent] ?? 0) + 1;
      confidenceSum += event.confidence;
      successSum += event.successScore;

      for (const tag of event.tags) {
        byTag[tag] = (byTag[tag] ?? 0) + 1;
      }
    }

    return {
      scope: normalizedScope,
      total: scoped.length,
      byAction: this.sortCountMap(byAction),
      byIntent: this.sortCountMap(byIntent),
      averageConfidence: this.roundRatio(confidenceSum / scoped.length),
      averageSuccessScore: this.roundRatio(successSum / scoped.length),
      latest: scoped.at(-1) ?? null,
      topTags: Object.entries(byTag)
        .sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
        .slice(0, 25)
        .map(([tag, count]) => ({ tag, count })),
      updatedAt: scoped.at(-1)?.createdAt ?? null,
    };
  }

  public async snapshot(): Promise<AILocalLearningStoreSnapshot> {
    const scopes = Array.from(new Set(this.events.map((event) => event.memoryScope))).sort();

    return {
      maxEvents: this.maxEvents,
      totalEvents: this.events.length,
      scopes,
      latest: this.events.at(-1) ?? null,
    };
  }

  public async clearScope(scope: string): Promise<number> {
    const normalizedScope = normalizeToken(scope, "default");
    const before = this.events.length;

    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i]?.memoryScope === normalizedScope) {
        this.events.splice(i, 1);
      }
    }

    return before - this.events.length;
  }

  private sortEvents(): void {
    this.events.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      if (a.logicalIndex !== b.logicalIndex) return a.logicalIndex - b.logicalIndex;
      return a.id.localeCompare(b.id);
    });
  }

  private trimOldest(): void {
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  private sortCountMap(input: Record<string, number>): Record<string, number> {
    return Object.keys(input)
      .sort()
      .reduce<Record<string, number>>((acc, key) => {
        acc[key] = input[key] ?? 0;
        return acc;
      }, {});
  }

  private roundRatio(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}
