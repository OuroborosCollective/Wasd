import { NPCManager } from '../managers/NPCManager';
import { LegendManager } from '../managers/LegendManager';
import { FactionManager } from '../managers/FactionManager';

export interface Legend {
    id: string;
    name: string;
    description: string;
}

export interface NPC {
    id: string;
    name: string;
    beliefs: Legend[];
}

function hash32(input: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

function chance(seed: string, modulo: number): number {
    return hash32(seed) % modulo;
}

function pickDeterministic<T extends { id: string }>(items: readonly T[], seed: string): T | null {
    if (items.length === 0) return null;
    const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id));
    return ordered[hash32(seed) % ordered.length] ?? null;
}

export class LegendPropagationSystem {
    private static readonly LEGEND_SPREAD_PER_10000: number = 200;
    private static readonly FACTION_FORM_PER_10000: number = 100;
    private static readonly CRITICAL_MASS_THRESHOLD: number = 5;

    public static update(): void {
        const rawNpcs = NPCManager.instance.getAllNPCs();
        const npcs: NPC[] = rawNpcs.map((n) => ({
            id: n.id,
            name: (n as { name?: string }).name ?? n.id,
            beliefs: (n as { beliefs?: Legend[] }).beliefs ?? [],
        })).sort((a, b) => a.id.localeCompare(b.id));

        const rawLegends = LegendManager.instance.getGlobalLegends();
        const globalLegends: Legend[] = rawLegends.map((l) => ({
            id: l.id,
            name: (l as { name?: string }).name ?? l.id,
            description: (l as { description?: string }).description ?? "",
        })).sort((a, b) => a.id.localeCompare(b.id));

        this.handleLegendPropagation(npcs, globalLegends);
        this.handleFactionFormation(npcs);
    }

    private static handleLegendPropagation(npcs: NPC[], globalLegends: Legend[]): void {
        npcs.forEach(targetNpc => {
            const seed = `legend-spread:${targetNpc.id}:${targetNpc.beliefs.map((belief) => belief.id).sort().join(',')}:${globalLegends.map((legend) => legend.id).join(',')}`;
            if (chance(seed, 10000) < this.LEGEND_SPREAD_PER_10000) {
                const legend = this.selectLegendToSpread(npcs, globalLegends, seed);
                if (legend && !this.npcHasLegend(targetNpc, legend)) {
                    targetNpc.beliefs.push(legend);
                }
            }
        });
    }

    private static selectLegendToSpread(npcs: NPC[], globalLegends: Legend[], seed: string): Legend | null {
        if (chance(`${seed}:global`, 2) === 0 && globalLegends.length > 0) {
            return pickDeterministic(globalLegends, `${seed}:global-pick`);
        }

        const npcsWithBeliefs = npcs
            .filter(n => n.beliefs.length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));
        const sourceNpc = pickDeterministic(npcsWithBeliefs, `${seed}:source-npc`);
        if (!sourceNpc) return null;
        return pickDeterministic(sourceNpc.beliefs, `${seed}:source-belief`);
    }

    private static npcHasLegend(npc: NPC, legend: Legend): boolean {
        return npc.beliefs.some(l => l.id === legend.id);
    }

    private static handleFactionFormation(npcs: NPC[]): void {
        const beliefGroups: Map<string, { legend: Legend, members: NPC[] }> = new Map();

        npcs.forEach(npc => {
            npc.beliefs.forEach(legend => {
                if (!beliefGroups.has(legend.id)) {
                    beliefGroups.set(legend.id, { legend, members: [] });
                }
                beliefGroups.get(legend.id)!.members.push(npc);
            });
        });

        [...beliefGroups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([legendId, group]) => {
            group.members.sort((a, b) => a.id.localeCompare(b.id));
            if (group.members.length >= this.CRITICAL_MASS_THRESHOLD) {
                const seed = `faction-form:${legendId}:${group.members.map((m) => m.id).join(',')}`;
                if (chance(seed, 10000) < this.FACTION_FORM_PER_10000) {
                    FactionManager.instance.createFaction(group.legend.name, group.members.map((m) => m.id));
                }
            }
        });
    }
}
