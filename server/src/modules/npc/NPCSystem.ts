export class NPCSystem {
    public resonanceEngine = {
        getResonance: (key: string) => ({ faith: 0.5, aggression: 0.5, curiosity: 0.5 }),
        getAllResonance: () => new Map(),
        getChunkKey: (...args: any[]) => ""
    };
    public createNPC(...args: any[]) {}
    public getNPC(...args: any[]) { return null; }
    public getAllNPCs() { return []; }
    public removeNPC(...args: any[]) {}
    public runFusionHeuristics() {}
    public setRuntimeDialogue(...args: any[]) {}
    public setQuestEchoProvider(...args: any[]) {}
    public setProfileResolver(...args: any[]) {}
    public tick(...args: any[]) {}
    public getNPCsMap() { return new Map(); }
    public checkStealthDeterministic(...args: any[]) { return true; }
}
