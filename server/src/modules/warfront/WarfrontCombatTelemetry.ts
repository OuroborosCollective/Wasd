import { WorldHistory } from "../history/WorldHistory.js";
import { serverWorldEventBus } from "../../events/WorldEventBus.js";
import { pushLiveTickerHazard } from "../../theme/serverThemeHazard.js";
import { WARFRONT_TICK_MS } from "./warfrontTypes.js";

export type WarfrontFeedKind = "hit" | "kill";

export interface WarfrontFeedEntry {
  seq: number;
  tick: number;
  kind: WarfrontFeedKind;
  attackerId: string;
  defenderId: string;
  damage: number;
  /** Portal Echo line + Emily context */
  summary: string;
}

export interface WarfrontHudAgent {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  aggression: number;
  side: "warfront" | "dummy" | "player";
}

export interface WarfrontHudSnapshot {
  tick: number;
  originX: number;
  originY: number;
  agents: WarfrontHudAgent[];
  lastEventSummary: string | null;
}

const RING_CAP = 256;

export class WarfrontCombatTelemetry {
  private static inst: WarfrontCombatTelemetry | null = null;

  private seq = 0;
  private readonly ring: WarfrontFeedEntry[] = [];
  private lastHud: WarfrontHudSnapshot = {
    tick: 0,
    originX: 500,
    originY: 500,
    agents: [],
    lastEventSummary: null,
  };

  static getInstance(): WarfrontCombatTelemetry {
    if (!WarfrontCombatTelemetry.inst) WarfrontCombatTelemetry.inst = new WarfrontCombatTelemetry();
    return WarfrontCombatTelemetry.inst;
  }

  static resetForTests(): void {
    WarfrontCombatTelemetry.inst = null;
  }

  setHud(s: WarfrontHudSnapshot): void {
    this.lastHud = s;
  }

  getHud(): WarfrontHudSnapshot {
    return this.lastHud;
  }

  getFeedSince(sinceSeq: number): { events: WarfrontFeedEntry[]; lastSeq: number; hud: WarfrontHudSnapshot } {
    const events = this.ring.filter((e) => e.seq > sinceSeq);
    return { events, lastSeq: this.seq, hud: this.lastHud };
  }

  private push(entry: Omit<WarfrontFeedEntry, "seq">): WarfrontFeedEntry {
    this.seq += 1;
    const full: WarfrontFeedEntry = { ...entry, seq: this.seq };
    this.ring.push(full);
    while (this.ring.length > RING_CAP) this.ring.shift();

    WorldHistory.getInstance().addEvent({
      id: `wf_${full.seq}_${full.tick}`,
      title: full.kind === "kill" ? "Warfront kill" : "Warfront hit",
      description: full.summary,
      timestamp: full.tick * WARFRONT_TICK_MS,
      involvedFactionIds: [full.attackerId, full.defenderId],
    });

    serverWorldEventBus.emit("warfront_combat", full);

    if (full.kind === "kill") {
      pushLiveTickerHazard({
        hazard_index: Math.min(0.96, 0.62 + full.damage * 0.004),
        aggression_trend: 0.006,
      });
    }

    return full;
  }

  recordHit(ctx: { tick: number; attackerId: string; defenderId: string; damage: number; summary: string }): void {
    void this.push({ tick: ctx.tick, kind: "hit", attackerId: ctx.attackerId, defenderId: ctx.defenderId, damage: ctx.damage, summary: ctx.summary });
  }

  recordKill(ctx: { tick: number; attackerId: string; defenderId: string; damage: number; summary: string }): void {
    void this.push({ tick: ctx.tick, kind: "kill", attackerId: ctx.attackerId, defenderId: ctx.defenderId, damage: ctx.damage, summary: ctx.summary });
  }
}
