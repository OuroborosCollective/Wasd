const ARE_PAYLOAD_TICK_MS = 100;

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

function normalizeTick(tick: number): number {
    if (!Number.isSafeInteger(tick) || tick < 0) return 0;
    return tick;
}

export class AREPayload {
    private readonly _data: IAREPayload;

    constructor(tick: number, npcs: INPCState[]) {
        const safeTick = normalizeTick(tick);
        this._data = {
            tk: safeTick,
            ts: safeTick * ARE_PAYLOAD_TICK_MS,
            en: this._filterAndMap(npcs)
        };
    }

    /**
     * Filters NPC states for status validation and maps them into an object
     * for O(1) lookup during resolution.
     */
    private _filterAndMap(npcs: INPCState[]): Record<string, INPCState> {
        const lookup: Record<string, INPCState> = Object.create(null);
        const activeNpcs = npcs
            .filter((npc) => npc.s > 0 && npc.h > 0)
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

        for (const npc of activeNpcs) {
            lookup[npc.id] = npc;
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
