export class NPCMemoryCache {
  private static inst = new NPCMemoryCache();

  static getInstance(): NPCMemoryCache {
    return NPCMemoryCache.inst;
  }

  getEvents() {
    return [];
  }
}
