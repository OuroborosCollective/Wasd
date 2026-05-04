// @ts-nocheck
export interface INPCState {
    id: string;
    v: [number, number, number];
    r: number;
    s: number;
    h: number;
    a: number;
    p: Record<string, any>;
}

export interface IAREPayload {
    tk: number;
    ts: number;
    en: Record<string, INPCState>;
}

export class AREPayload {
    private readonly _data: IAREPayload;

    constructor(tick: number, npcs: INPCState[]) {
        this._data = {
            tk: tick,
            ts: Date.now(),
            en: this._filterAndMap(npcs)
        };
    }

    /**
     * Filters NPC states for status validation and maps them into an object
     * for O(1) lookup during resolution.
     */
    private _filterAndMap(npcs: INPCState[]): Record<string, INPCState> {
        const lookup: Record<string, INPCState> = Object.create(null);
        const len = npcs.length;
        
        for (let i = 0; i < len; i++) {
            const npc = npcs[i];
            
            // Status validation: 0 is considered 'void' or 'invalid'
            // Ensures stateless determinism by only including relevant actors
            if (npc.s > 0 && npc.h > 0) {
                lookup[npc.id] = npc;
            }
        }
        
        return lookup;
    }

    /**
     * O(1) Access to entity state
     */
    public getEntity(id: string): INPCState | undefined {
        return this._data.en[id];
    }

    /**
     * Serializes the current payload for transmission
     */
    public serialize(): string {
        return JSON.stringify(this._data);
    }

    /**
     * Reconstructs payload from serialized data
     */
    public static deserialize(json: string): IAREPayload {
        return JSON.parse(json) as IAREPayload;
    }

    public get tick(): number {
        return this._data.tk;
    }

    public get entities(): Record<string, INPCState> {
        return this._data.en;
    }

    public get timestamp(): number {
        return this._data.ts;
    }
}