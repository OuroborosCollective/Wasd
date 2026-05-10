/**
 * NPCManager.ts
 */
interface NPC { id: string; }

export class NPCManager {
    static instance = new NPCManager();
    
    get(id: string): NPC | null { return null; }
    
    getAllNPCs(): NPC[] { return []; }
}