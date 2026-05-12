export class NPCMemoryCache {
    private static instance: NPCMemoryCache;
    public static getInstance(): NPCMemoryCache {
        if (!this.instance) this.instance = new NPCMemoryCache();
        return this.instance;
    }
    getEvents() { return []; }
}
