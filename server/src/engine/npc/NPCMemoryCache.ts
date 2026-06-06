import { NPCMemoryCache as LiveNPCMemoryCache } from "../../modules/npc/NPCMemoryCache.js";

/**
 * Compatibility singleton for older engine/npc code.
 * The live implementation is server/src/modules/npc/NPCMemoryCache.ts.
 */
export class NPCMemoryCache extends LiveNPCMemoryCache {
  private static inst = new NPCMemoryCache();

  static getInstance(): NPCMemoryCache {
    return NPCMemoryCache.inst;
  }
}

export default NPCMemoryCache;
