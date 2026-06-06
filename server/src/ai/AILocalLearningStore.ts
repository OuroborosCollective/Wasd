/**
 * AILocalLearningStore.ts
 * Local learning store for AI decisions.
 * Keeps bounded history for pattern analysis.
 */

import type { AILearningEvent } from "./AIService.types.js";

export interface IAILocalLearningStore {
  record(event: AILearningEvent): Promise<void>;
  list(scope: string, limit?: number): Promise<AILearningEvent[]>;
  summarize(scope: string): Promise<Record<string, unknown>>;
}

export class AILocalLearningStore implements IAILocalLearningStore {
  private readonly events: AILearningEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = 10_000) {
    this.maxEvents = Math.max(100, maxEvents);
  }

  public async record(event: AILearningEvent): Promise<void> {
    this.events.push(Object.freeze({ ...event }));

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  public async list(scope: string, limit = 50): Promise<AILearningEvent[]> {
    return this.events
      .filter((event) => event.memoryScope === scope)
      .slice(-Math.max(1, Math.min(limit, 500)));
  }

  public async summarize(scope: string): Promise<Record<string, unknown>> {
    const scoped = this.events.filter((event) => event.memoryScope === scope);
    const total = scoped.length;

    const byAction: Record<string, number> = {};
    const byIntent: Record<string, number> = {};

    for (const event of scoped) {
      byAction[event.action] = (byAction[event.action] ?? 0) + 1;
      byIntent[event.intent] = (byIntent[event.intent] ?? 0) + 1;
    }

    return {
      scope,
      total,
      byAction,
      byIntent,
      latest: scoped.at(-1) ?? null,
    };
  }
}