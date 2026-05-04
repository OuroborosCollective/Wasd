// @ts-nocheck
export interface NPCTraits {
    faith: number;
    aggression: number;
}

export interface WorldPosition {
    x: number;
    y: number;
}

export interface NPC {
    guildId: string;
    traits: NPCTraits;
    position: WorldPosition;
}

export const CHUNK_SIZE = 64;

export function getChunkKey(x: number, y: number): string {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    return `${cx}:${cy}`;
}

export class TerritoryControl {
    private territoryMap: Map<string, string>;

    constructor() {
        this.territoryMap = new Map<string, string>();
    }

    public setOwner(chunkKey: string, guildId: string): void {
        this.territoryMap.set(chunkKey, guildId);
    }

    public getOwner(chunkKey: string): string | undefined {
        return this.territoryMap.get(chunkKey);
    }

    public removeOwner(chunkKey: string): void {
        this.territoryMap.delete(chunkKey);
    }

    public getMap(): Map<string, string> {
        return this.territoryMap;
    }
}

export function applyGuildSovereignty(npc: NPC, territoryMap: Map<string, string>): void {
    const chunkKey = getChunkKey(npc.position.x, npc.position.y);
    const ownerGuildId = territoryMap.get(chunkKey);

    if (ownerGuildId && npc.guildId === ownerGuildId) {
        npc.traits.faith = Number(Math.min(1.0, npc.traits.faith + 0.05).toFixed(4));
        npc.traits.aggression = Number(Math.max(0.0, npc.traits.aggression - 0.02).toFixed(4));
    }
}