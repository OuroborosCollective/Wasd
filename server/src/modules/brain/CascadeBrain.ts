export class CascadeBrain {
    checkCascade(brainState: { activeAnomalies: string[], centerValue: number }): boolean {
        if (!brainState) return false;

        const hasMarketCrash = brainState.activeAnomalies?.includes("MARKET_CRASH_PROBABLE") || false;
        const highCenterValue = brainState.centerValue > 0.9;

        return hasMarketCrash && highCenterValue;
    }
}
