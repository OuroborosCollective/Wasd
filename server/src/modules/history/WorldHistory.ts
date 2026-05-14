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
    }
}