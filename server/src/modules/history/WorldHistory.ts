// @ts-nocheck
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
    private events: IWorldEvent[];

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