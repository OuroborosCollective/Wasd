export class NPCManager {
    public static getInstance() { return new NPCManager(); }
    public getAllNPCs() { return []; }
    public get(id: string) { return null; }
    public spawnElite(data: any) {}
    public setGlobalAggroMultiplier(m: number) {}
    public increaseSpawnRate(rate: any, filter?: any) {}
}
