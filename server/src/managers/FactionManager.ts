/**
 * FactionManager.ts
 */
interface Faction { name: string; members: string[]; }

export class FactionManager {
    static instance = new FactionManager();
    
    get(id: string): Faction | null { return null; }
    
    createFaction(name: string, members: string[]): Faction { return { name, members }; }
}
