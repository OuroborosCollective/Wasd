export interface NPCContext {
    npc: any;
    worldState: any;
    worldHistory: any;
    recentMessages: any[];
}
export class NPCChatAgent {
    public async generateResponse(context: NPCContext): Promise<string> {
        return "Hello";
    }
}
export const tickNpcChat = async (a: any, b: any, c: any, d: any, e: any, f: any, g: any) => {};
