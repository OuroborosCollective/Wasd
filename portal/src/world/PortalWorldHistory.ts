/**
 * Client-side WorldHistory mirror — same singleton pattern as server
 * `server/src/modules/history/WorldHistory.ts`, scoped to portal echo stream.
 *
 * Ring buffer: O(1) push, O(1) read head, O(k) snapshot for small k (UI).
 */

import type { IWorldEvent } from "./portalWorldTypes";

export type EchoKind = "combat" | "trade" | "loot";
export type LootEchoQuality = "epic" | "legendary" | "mythic" | string;

export interface LootEchoMeta {
  itemId: string;
  itemName: string;
  quality: LootEchoQuality;
  sector: string;
  probability: number;
  rollHash?: string;
  sourceId?: string;
}

export interface WorldEcho {
  id: string;
  kind: EchoKind;
  summary: string;
  ts: number;
  loot?: LootEchoMeta;
  /** Optional mirror of server-style world lines */
  worldLine?: Pick<IWorldEvent, "title" | "description">;
}

const CAP = 128;

export class PortalWorldHistory {
  private static instance: PortalWorldHistory | null = null;

  private readonly ring: (WorldEcho | null)[] = new Array(CAP).fill(null);
  private writeSeq = 0;
  private readonly listeners = new Set<() => void>();

  static getInstance(): PortalWorldHistory {
    if (!PortalWorldHistory.instance) {
      PortalWorldHistory.instance = new PortalWorldHistory();
    }
    return PortalWorldHistory.instance;
  }

  static resetForTests(): void {
    PortalWorldHistory.instance = null;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        /* isolated */
      }
    }
  }

  /** O(1) append newest echo (overwrites oldest slot when full). */
  pushEcho(partial: Omit<WorldEcho, "id" | "ts"> & { id?: string; ts?: number }): WorldEcho {
    const id = partial.id ?? `echo_${this.writeSeq}_${partial.kind}`;
    const ts = partial.ts ?? Date.now();
    const entry: WorldEcho = { ...partial, id, ts };
    const slot = this.writeSeq % CAP;
    this.ring[slot] = entry;
    this.writeSeq++;
    this.notify();
    return entry;
  }

  recordNpcCombatComplete(summary: string, worldLine?: WorldEcho["worldLine"]): WorldEcho {
    return this.pushEcho({ kind: "combat", summary, worldLine });
  }

  recordNpcTradeComplete(summary: string, worldLine?: WorldEcho["worldLine"]): WorldEcho {
    return this.pushEcho({ kind: "trade", summary, worldLine });
  }

  recordLootDrop(meta: LootEchoMeta): WorldEcho {
    const probabilityPct = (meta.probability * 100).toFixed(4);
    const summary = `Golden loot echo · ${meta.quality.toUpperCase()} · ${meta.itemName} · sector ${meta.sector} · p=${probabilityPct}%`;
    return this.pushEcho({
      kind: "loot",
      summary,
      loot: meta,
      worldLine: {
        title: `Loot manifestation · ${meta.quality.toUpperCase()}`,
        description: `Architekt Thomas, die Kausalität hat ${meta.itemName} in Sektor ${meta.sector} manifestiert. Wahrscheinlichkeit: ${probabilityPct}%.`,
      },
    });
  }

  /** O(1) — most recent echo or null. */
  getHead(): WorldEcho | null {
    if (this.writeSeq === 0) return null;
    return this.ring[(this.writeSeq - 1) % CAP];
  }

  /** O(k) for bounded UI lists (k ≪ CAP). */
  snapshotRecent(max = 32): WorldEcho[] {
    const n = Math.min(max, this.writeSeq, CAP);
    const out: WorldEcho[] = [];
    for (let i = 0; i < n; i++) {
      const e = this.ring[(this.writeSeq - 1 - i + CAP * 2) % CAP];
      if (e) out.push(e);
    }
    return out;
  }

  /** Snapshot version for useSyncExternalStore (bump each push). */
  getVersion(): number {
    return this.writeSeq;
  }

  /** Compact digest for mascot / stress HUD (bounded window). */
  getEchoDigestSummary(max = 10): {
    combat: number;
    trade: number;
    loot: number;
    total: number;
    lines: string[];
  } {
    const slice = this.snapshotRecent(max);
    const combat = slice.filter((e) => e.kind === "combat").length;
    const trade = slice.filter((e) => e.kind === "trade").length;
    const loot = slice.filter((e) => e.kind === "loot").length;
    const lines = slice.slice(0, 5).map((e) => `[${e.kind}] ${e.summary.slice(0, 72)}`);
    return { combat, trade, loot, total: slice.length, lines };
  }

  /** Optional: ingest server-shaped world lines as echo metadata. */
  ingestWorldLine(ev: IWorldEvent): void {
    const t = (ev.title + " " + ev.description).toLowerCase();
    if (t.includes("loot") || t.includes("drop") || t.includes("legendary") || t.includes("epic")) {
      this.pushEcho({ kind: "loot", summary: ev.title, worldLine: { title: ev.title, description: ev.description } });
    } else if (t.includes("trade") || t.includes("handel") || t.includes("deal")) {
      this.recordNpcTradeComplete(ev.title, { title: ev.title, description: ev.description });
    } else if (t.includes("combat") || t.includes("kampf") || t.includes("kill")) {
      this.recordNpcCombatComplete(ev.title, { title: ev.title, description: ev.description });
    }
  }
}
