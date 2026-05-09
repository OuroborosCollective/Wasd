export class NPCChatBridge {
    public getEvents(a?: any) { return []; }
    public getNPCCognitiveContext(a?: any, b?: any): any { return { npc: {}, worldState: {}, worldHistory: {}, recentMessages: [] }; }
    public persistInteraction(a?: any, b?: any, c?: any, d?: any) { return Promise.resolve(); }
}
