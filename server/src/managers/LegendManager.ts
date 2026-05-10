/**
 * LegendManager.ts
 */
interface Legend { id: string; }

export class LegendManager {
    static instance = new LegendManager();
    
    get(id: string): Legend | null { return null; }
    
    getGlobalLegends(): Legend[] { return []; }
}
