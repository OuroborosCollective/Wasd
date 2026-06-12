/**
 * WorldHistory — append-only event log for the living world.
 */

import { type WorldEvent } from "./WorldEventBus.js";

function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  return hash32(seed) % length;
}

export interface HistoryEntry {
  eventId: string;
  type: string;
  ts: number;
  actorName: string;
  targetName?: string;
  summary: string;
  regionId?: string;
  intensity: number;
  impactScore: number;
}

export interface Legend {
  id: string;
  originEventId: string;
  title: string;
  narrative: string;
  retellCount: number;
  createdAt: number;
  knownBy: Set<string>;
  impactScore: number;
  regionId?: string;
  type?: string;
}

const MAX_HISTORY = 2000;
const LEGEND_THRESHOLD = 0.75;
let legendCounter = 0;

export class WorldHistory {
  private entries: HistoryEntry[] = [];
  private legends: Legend[] = [];

  record(event: WorldEvent): number {
    const impactScore = this.calculateImpact(event);
    const summary = this.summarize(event);
    const entry: HistoryEntry = {
      eventId: event.id,
      type: event.type,
      ts: event.ts,
      actorName: event.actorName,
      targetName: event.targetName,
      summary,
      regionId: event.regionId,
      intensity: event.intensity,
      impactScore,
    };

    this.entries.push(entry);
    if (this.entries.length > MAX_HISTORY) this.entries = this.entries.slice(-MAX_HISTORY);
    if (impactScore >= LEGEND_THRESHOLD) this.createLegend(entry);
    return impactScore;
  }

  getRecent(limit = 50): HistoryEntry[] {
    return this.entries.slice(-limit);
  }

  getRecentEvents(limit = 50): HistoryEntry[] {
    return this.getRecent(limit);
  }

  getLegends(): Legend[] {
    return this.legends;
  }

  getLegendsKnownBy(agentId: string): Legend[] {
    return this.legends.filter((legend) => legend.knownBy.has(agentId));
  }

  getLegendsUnknownTo(agentId: string): Legend[] {
    return this.legends.filter((legend) => !legend.knownBy.has(agentId));
  }

  spreadLegend(legendId: string, fromAgentId: string, toAgentId: string): Legend | null {
    const legend = this.legends.find((entry) => entry.id === legendId);
    if (!legend || !legend.knownBy.has(fromAgentId)) return null;
    if (legend.knownBy.has(toAgentId)) return legend;
    legend.knownBy.add(toAgentId);
    legend.retellCount++;
    legend.narrative = this.mutateNarrative(legend.narrative, legend.retellCount);
    return legend;
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  getLegendCount(): number {
    return this.legends.length;
  }

  private calculateImpact(event: WorldEvent): number {
    const typeWeights: Partial<Record<string, number>> = {
      combat_kill: 0.7,
      war_declared: 0.9,
      peace_treaty: 0.8,
      faction_formed: 0.6,
      alliance_formed: 0.7,
      scarcity_event: 0.65,
      legend_created: 0.5,
      trade_complete: 0.2,
      quest_completed: 0.4,
      level_up: 0.3,
      agent_died: 0.8,
      agent_born: 0.3,
      family_formed: 0.4,
    };
    const typeWeight = typeWeights[event.type] ?? 0.3;
    return Math.min(1, event.intensity * 0.4 + typeWeight * 0.6);
  }

  private summarize(event: WorldEvent): string {
    const actor = event.actorName;
    const target = event.targetName ?? "";
    switch (event.type) {
      case "combat_kill": return `${actor} besiegte ${target} im Kampf.`;
      case "war_declared": return `${actor} erklärte ${target} den Krieg!`;
      case "peace_treaty": return `${actor} und ${target} schlossen Frieden.`;
      case "faction_formed": return `${actor} gründete eine neue Fraktion: ${event.data.factionName ?? "unbekannt"}.`;
      case "alliance_formed": return `${actor} und ${target} schmiedeten ein Bündnis.`;
      case "trade_complete": return `${actor} handelte mit ${target}.`;
      case "quest_completed": return `${actor} vollendete eine Quest: ${event.data.questName ?? ""}.`;
      case "scarcity_event": return `Knappheit: ${event.data.resource ?? "Ressourcen"} in der Region.`;
      case "agent_died": return `${actor} fiel. Die Welt trauert.`;
      case "agent_born": return `${actor} wurde geboren.`;
      case "family_formed": return `${actor} und ${target} gründeten eine Familie.`;
      case "level_up": return `${actor} erreichte Level ${event.data.level ?? "?"}.`;
      default: return `${actor}: ${event.type}`;
    }
  }

  private createLegend(entry: HistoryEntry): Legend {
    const seed = `legend:${entry.eventId}:${entry.ts}`;
    const legend: Legend = {
      id: `legend_${++legendCounter}`,
      originEventId: entry.eventId,
      title: this.generateLegendTitle(entry, seed),
      narrative: entry.summary,
      retellCount: 0,
      createdAt: entry.ts,
      knownBy: new Set(),
      impactScore: entry.impactScore,
      regionId: entry.regionId,
    };
    this.legends.push(legend);
    return legend;
  }

  private generateLegendTitle(entry: HistoryEntry, seed: string): string {
    const prefixes = ["Die Sage von", "Die Geschichte von", "Das Schicksal von", "Die Legende von"];
    return `${prefixes[deterministicIndex(seed, prefixes.length)]} ${entry.actorName}`;
  }

  private mutateNarrative(narrative: string, retellCount: number): string {
    if (retellCount < 3) return narrative;
    const embellishments = [
      " Man sagt, es war noch viel dramatischer.",
      " Die Alten erzählen es anders.",
      " Manche behaupten, es waren Hunderte beteiligt.",
      " Der Wind flüstert noch heute davon.",
      " Einige sagen, die Götter selbst schauten zu.",
    ];
    if (retellCount % 5 === 0) {
      return narrative + embellishments[deterministicIndex(`embellishment:${retellCount}:${narrative}`, embellishments.length)];
    }
    return narrative;
  }
}
