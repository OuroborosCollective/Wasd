// @ARE-GUARD-EXEMPT: non-sim module
export class GuildSovereigntyEngine {
    private sovereigntyMap = new Map<string, number>();
    
    getSovereignty(chunkId: string): number {
        return this.sovereigntyMap.get(chunkId) ?? 0.5;
    }
    
    getAggressionMitigationFactor(chunkId: string): number {
        return this.getSovereignty(chunkId);
    }
}
