export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    merkleRoot: string;
}
export class AREStateCompiler {
    public compileEntity(entity: any, tick: number): any { return {}; }
    public validateTransition(state: any, action: any): ValidationResult { return { isValid: true, merkleRoot: "0x0" }; }
    public commitOrderToState(order: any): void {}
    public queryOrderState(orderId: string): any { return { status: "committed" }; }
}
export class WeatherResonance {
    public calculateCurrentResonance(): number { return 0.5; }
    public static calculate(): number { return 0.5; }
}
export class WorldEventBus {
    public static getInstance() { return new WorldEventBus(); }
    public emit(event: string, data?: any) {}
    public on(event: string, cb: any) {}
    public onAll(cb: any) {}
}
export class NPCManager {
    public static getInstance() { return new NPCManager(); }
    public getAllNPCs() { return []; }
    public get(id: string) { return null; }
    public spawnElite(data: any) {}
    public setGlobalAggroMultiplier(m: number) {}
    public increaseSpawnRate(r: any, a?: any) {}
}
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
export class PlexityLogic {
    public static calculate() { return 1; }
    public checkResonance(a?: any) { return true; }
}
