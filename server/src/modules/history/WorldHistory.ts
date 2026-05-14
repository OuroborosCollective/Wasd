export interface IFactionLegend {
    id: string;
    title: string;
    description: string;
    timestamp: number;
    factionId: string;
}

export interface IWorldEvent {
    id: string;
    title: string;
    description: string;
    timestamp: number;
    involvedFactionIds: string[];
}

export class WorldHistory {
    private static instance: WorldHistory;
    private events: IWorldEvent[];
    private readonly listeners = new Map<string, Array<(payload: unknown) => void>>();

    /** Last up to 100 world-tick samples of global aggression average (0..1), oldest → newest. */
    private aggressionSamples: number[] = [];
    private static readonly MAX_AGG_SAMPLES = 100;

    public static getInstance(): WorldHistory {
        if (!WorldHistory.instance) {
            WorldHistory.instance = new WorldHistory();
        }
        return WorldHistory.instance;
    }

    public on(event: string, handler: (payload: unknown) => void): void {
        const list = this.listeners.get(event) ?? [];
        list.push(handler);
        this.listeners.set(event, list);
    }

    constructor() {
        this.events = [];
    }

    public addEvent(event: IWorldEvent): void {
        this.events.push(event);
    }

    public getAllEvents(): IWorldEvent[] {
        return [...this.events];
    }

    /** Most recent world events (newest last), capped for chat / mascot context. */
    public getRecentEvents(max = 10): IWorldEvent[] {
        const n = Math.min(max, this.events.length);
        return n === 0 ? [] : this.events.slice(-n);
    }

    public getLegendsByFaction(factionId: string): IFactionLegend[] {
        return this.events
            .filter(event => event.involvedFactionIds.includes(factionId))
            .map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                timestamp: event.timestamp,
                factionId: factionId
            }));
    }

    public clearHistory(): void {
        this.events = [];
        this.aggressionSamples = [];
    }

    /**
     * Record one tick of global aggression (typically mean NPC aggression this tick).
     * Keeps the last 100 values for hazard analysis.
     */
    public recordAggressionSample(aggressionAvg: number, _tick?: number): void {
        void _tick;
        const v = Math.max(0, Math.min(1, aggressionAvg));
        this.aggressionSamples.push(v);
        while (this.aggressionSamples.length > WorldHistory.MAX_AGG_SAMPLES) {
            this.aggressionSamples.shift();
        }
    }

    /** Read-only aggression window (up to `max` most recent ticks, capped at stored length). */
    public getAggressionSeries(max: number = WorldHistory.MAX_AGG_SAMPLES): readonly number[] {
        const n = Math.min(max, this.aggressionSamples.length);
        return this.aggressionSamples.slice(-n);
    }
}