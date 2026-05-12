export class NPCManager {
    private static instance: NPCManager;
    public static getInstance(): NPCManager {
        if (!this.instance) this.instance = new NPCManager();
        return this.instance;
    }
    public spawnElite(config: any): void {}
    public setGlobalAggroMultiplier(mult: number): void {}
    public increaseSpawnRate(predicate: (regionId: string) => boolean, rate: number): void {}
}
