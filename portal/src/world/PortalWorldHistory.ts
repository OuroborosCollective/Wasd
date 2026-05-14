/**
 * Client-side WorldHistory mirror — same singleton pattern as server
 * `server/src/modules/history/WorldHistory.ts`, scoped to portal echo stream.
 *
 * Ring buffer: O(1) push, O(1) read head, O(k) snapshot for small k (UI).
 */

import type { IWorldEvent } from "./portalWorldTypes";

export type EchoKind = "combat" | "trade";

export interface WorldEcho {
  id: string;
  kind: EchoKind;
  summary: string;
  ts: number;
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

  /** Optional: ingest server-shaped world lines as echo metadata. */
  ingestWorldLine(ev: IWorldEvent): void {
    const t = (ev.title + " " + ev.description).toLowerCase();
    if (t.includes("trade") || t.includes("handel") || t.includes("deal")) {
      this.recordNpcTradeComplete(ev.title, { title: ev.title, description: ev.description });
    } else if (t.includes("combat") || t.includes("kampf") || t.includes("kill")) {
      this.recordNpcCombatComplete(ev.title, { title: ev.title, description: ev.description });
    }
  }
}
