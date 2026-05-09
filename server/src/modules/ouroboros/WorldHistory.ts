export class WorldHistory {
    public static getInstance() { return new WorldHistory(); }
    public on(event: string, cb: any) {}
    public record(a?: any, b?: any) {}
    public getEntryCount() { return 0; }
    public getLegendCount() { return 0; }
    public getLegendsUnknownTo(id: string) { return []; }
    public getLegendsKnownBy(id: string) { return []; }
    public spreadLegend(legendId: string, fromId: string, toId: string) {}
    public getLegendsByFaction(factionId: string) { return []; }
}
export type Legend = any;
