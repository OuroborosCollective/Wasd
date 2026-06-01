/**
 * DynamicFactions — emergent faction formation, politics, and war/peace resolution.
 *
 * Factions form when N+ agents share territory + goals.
 * Political stance shifts via member experience aggregation.
 * Wars declared when hostility > threshold AND resource conflict exists.
 */

export interface DynamicFaction {
  id: string;
  name: string;
  founderId: string;
  members: Set<string>;
  treasury: number;
  reputation: number;
  /** Aggregated heuristic stance from member experiences. */
  politicalStance: {
    aggression: number;
    tradeOpenness: number;
    expansionism: number;
    isolationism: number;
  };
  /** Per-faction hostility scores toward other factions. */
  hostility: Map<string, number>;
  /** Allied faction IDs. */
  allies: Set<string>;
  /** Faction-level heuristic weights (evolve from member aggregation). */
  heuristics: Record<string, number>;
  territory: Set<string>;
  createdAt: number;
}

export interface FamilyUnit {
  id: string;
  members: string[];
  reputation: number;
  /** Memory fragments shared across family (stories, warnings, grudges). */
  sharedMemories: string[];
  /** Heuristic seeds inherited by children. */
  heuristicSeeds: Record<string, number>;
  createdAt: number;
}

const MIN_FACTION_SIZE = 3;
const ALLIANCE_THRESHOLD = 0.6;
const WAR_THRESHOLD = 0.7;
const FAMILY_AFFINITY_THRESHOLD = 0.7;

let factionCounter = 0;
let familyCounter = 0;

export class DynamicFactions {
  private factions = new Map<string, DynamicFaction>();
  private families = new Map<string, FamilyUnit>();
  private agentFaction = new Map<string, string>();
  private agentFamily = new Map<string, string>();

  /** Create a new faction from a group of agents with shared goals. */
  formFaction(name: string, founderId: string, memberIds: string[]): DynamicFaction {
    const id = `faction_${++factionCounter}`;
    const faction: DynamicFaction = {
      id,
      name,
      founderId,
      members: new Set([founderId, ...memberIds]),
      treasury: 0,
      reputation: 0,
      politicalStance: { aggression: 0.3, tradeOpenness: 0.5, expansionism: 0.3, isolationism: 0.3 },
      hostility: new Map(),
      allies: new Set(),
      heuristics: {},
      territory: new Set(),
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    };
    this.factions.set(id, faction);
    for (const mid of faction.members) {
      this.agentFaction.set(mid, id);
    }
    return faction;
  }

  /** Add an agent to a faction. */
  joinFaction(agentId: string, factionId: string): boolean {
    const f = this.factions.get(factionId);
    if (!f) return false;
    f.members.add(agentId);
    this.agentFaction.set(agentId, factionId);
    return true;
  }

  /** Remove an agent from their faction. */
  leaveFaction(agentId: string): void {
    const fid = this.agentFaction.get(agentId);
    if (!fid) return;
    const f = this.factions.get(fid);
    if (f) {
      f.members.delete(agentId);
      if (f.members.size === 0) this.factions.delete(fid);
    }
    this.agentFaction.delete(agentId);
  }

  /** Get faction for an agent. */
  getAgentFaction(agentId: string): DynamicFaction | undefined {
    const fid = this.agentFaction.get(agentId);
    return fid ? this.factions.get(fid) : undefined;
  }

  /** Adjust hostility between two factions. */
  adjustHostility(factionA: string, factionB: string, delta: number): void {
    const fa = this.factions.get(factionA);
    const fb = this.factions.get(factionB);
    if (!fa || !fb) return;
    const current = fa.hostility.get(factionB) ?? 0;
    const newVal = Math.max(-1, Math.min(1, current + delta));
    fa.hostility.set(factionB, newVal);
    fb.hostility.set(factionA, newVal);
  }

  /**
   * Check and resolve war/peace between factions.
   * Returns events to emit.
   */
  resolveConflicts(): Array<{ type: "war_declared" | "peace_treaty" | "alliance_formed"; factionA: string; factionB: string }> {
    const events: Array<{ type: "war_declared" | "peace_treaty" | "alliance_formed"; factionA: string; factionB: string }> = [];
    const factionList = Array.from(this.factions.values());

    for (let i = 0; i < factionList.length; i++) {
      for (let j = i + 1; j < factionList.length; j++) {
        const a = factionList[i];
        const b = factionList[j];
        const hostility = a.hostility.get(b.id) ?? 0;

        if (hostility > WAR_THRESHOLD && !a.allies.has(b.id)) {
          events.push({ type: "war_declared", factionA: a.id, factionB: b.id });
        } else if (hostility < -ALLIANCE_THRESHOLD && !a.allies.has(b.id)) {
          a.allies.add(b.id);
          b.allies.add(a.id);
          events.push({ type: "alliance_formed", factionA: a.id, factionB: b.id });
        } else if (hostility < 0.2 && a.allies.has(b.id) === false) {
          if (a.hostility.has(b.id) && hostility < 0.1) {
            events.push({ type: "peace_treaty", factionA: a.id, factionB: b.id });
          }
        }
      }
    }
    return events;
  }

  /**
   * Update faction political stance from member experience aggregation.
   */
  updatePoliticalStance(factionId: string, memberAggression: number[], memberTradeOpenness: number[]): void {
    const f = this.factions.get(factionId);
    if (!f || memberAggression.length === 0) return;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    f.politicalStance.aggression = avg(memberAggression);
    f.politicalStance.tradeOpenness = avg(memberTradeOpenness);
  }

  /** Form a family unit from agents with high affinity. */
  formFamily(agentA: string, agentB: string, affinity: number): FamilyUnit | null {
    if (affinity < FAMILY_AFFINITY_THRESHOLD) return null;
    if (this.agentFamily.has(agentA) || this.agentFamily.has(agentB)) return null;

    const id = `family_${++familyCounter}`;
    const family: FamilyUnit = {
      id,
      members: [agentA, agentB],
      reputation: 0,
      sharedMemories: [],
      heuristicSeeds: {},
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    };
    this.families.set(id, family);
    this.agentFamily.set(agentA, id);
    this.agentFamily.set(agentB, id);
    return family;
  }

  /** Get family for an agent. */
  getAgentFamily(agentId: string): FamilyUnit | undefined {
    const fid = this.agentFamily.get(agentId);
    return fid ? this.families.get(fid) : undefined;
  }

  /** Share a memory fragment across all family members. */
  shareMemory(familyId: string, memory: string): void {
    const f = this.families.get(familyId);
    if (!f) return;
    f.sharedMemories.push(memory);
    if (f.sharedMemories.length > 50) f.sharedMemories.shift();
  }

  getFaction(id: string): DynamicFaction | undefined {
    return this.factions.get(id);
  }

  getAllFactions(): DynamicFaction[] {
    return Array.from(this.factions.values());
  }

  getAllFamilies(): FamilyUnit[] {
    return Array.from(this.families.values());
  }

  /** Check if group of co-located agents could form a faction. */
  canFormFaction(agentIds: string[]): boolean {
    const unaffiliated = agentIds.filter((id) => !this.agentFaction.has(id));
    return unaffiliated.length >= MIN_FACTION_SIZE;
  }
}
