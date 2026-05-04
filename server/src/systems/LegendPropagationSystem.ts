// @ts-nocheck
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

export class LegendPropagationSystem {
    private static readonly LEGEND_SPREAD_CHANCE: number = 0.02;
    private static readonly FACTION_FORM_CHANCE: number = 0.01;
    private static readonly CRITICAL_MASS_THRESHOLD: number = 5;

    public static update(): void {
        const npcs: NPC[] = NPCManager.getAllNPCs();
        const globalLegends: Legend[] = LegendManager.getGlobalLegends();

        this.handleLegendPropagation(npcs, globalLegends);
        this.handleFactionFormation(npcs);
    }

    private static handleLegendPropagation(npcs: NPC[], globalLegends: Legend[]): void {
        npcs.forEach(targetNpc => {
            if (Math.random() < this.LEGEND_SPREAD_CHANCE) {
                const legend = this.selectLegendToSpread(npcs, globalLegends);
                if (legend && !this.npcHasLegend(targetNpc, legend)) {
                    targetNpc.beliefs.push(legend);
                }
            }
        });
    }

    private static selectLegendToSpread(npcs: NPC[], globalLegends: Legend[]): Legend | null {
        if (Math.random() < 0.5 && globalLegends.length > 0) {
            return globalLegends[Math.floor(Math.random() * globalLegends.length)];
        }

        const npcsWithBeliefs = npcs.filter(n => n.beliefs.length > 0);
        if (npcsWithBeliefs.length > 0) {
            const sourceNpc = npcsWithBeliefs[Math.floor(Math.random() * npcsWithBeliefs.length)];
            return sourceNpc.beliefs[Math.floor(Math.random() * sourceNpc.beliefs.length)];
        }

        return null;
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

        beliefGroups.forEach(group => {
            if (group.members.length >= this.CRITICAL_MASS_THRESHOLD) {
                if (Math.random() < this.FACTION_FORM_CHANCE) {
                    FactionManager.createFaction(group.legend, group.members);
                }
            }
        });
    }
}