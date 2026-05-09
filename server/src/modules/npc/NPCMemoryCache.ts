export class NPCMemoryCache {
    public static getInstance() { return new NPCMemoryCache(); }
    public static flushToDatabase() {}
    public hydrate(a?: any, b?: any) {}
    public getDirtyEntries() { return []; }
    public markSaved(a?: any) {}
    public getEvents(a?: any) { return []; }
    public get(id: string) { return null; }
    public observe(id: string, data: any) {}
    public logEvent(id: string, event: any) {}
    public setGoal(id: string, goal: any) {}
    public recordChat(id: string, message: any) {}
}
export type HeuristicWeights = any;
export type NPCMemoryState = any;
export type MemoryEvent = any;
