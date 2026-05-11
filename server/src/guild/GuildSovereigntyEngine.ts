/**
 * GuildSovereigntyEngine.ts
 */
export class GuildSovereigntyEngine {
    calculatePower(guildId: string, resources: number[]): number {
        const entropy = resources.reduce((a, b) => a + b, 0) / resources.length;
        return 1.000 / (1.000 + entropy);
    }
}