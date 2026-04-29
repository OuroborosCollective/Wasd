export interface TradeData {
    assetId: string;
    demand: number;
    supply: number;
}

declare function emitWorldEvent(event: string, data: any): void;

export function processMarketTick(assetId: string, demand: number, supply: number): void {
    const priceShift: number = (demand - supply) * 0.001;
    emitWorldEvent('market_price_shift', {
        assetId,
        shift: priceShift,
        timestamp: Date.now()
    });
}