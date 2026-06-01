class EmergentMarket {
    constructor() {
        this.imbalanceThreshold = 2.5;
    }

    async getLiquidityZone(assetId) {
        const orderBook = await this._fetchOrderBook(assetId);
        const depthAnalysis = this._analyzeDepth(orderBook);
        
        return {
            assetId,
            timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
            zones: depthAnalysis.zones,
            criticalImbalance: depthAnalysis.criticalImbalance,
            summary: {
                totalBidVolume: depthAnalysis.totalBidVolume,
                totalAskVolume: depthAnalysis.totalAskVolume,
                globalRatio: depthAnalysis.totalBidVolume / depthAnalysis.totalAskVolume
            }
        };
    }

    _analyzeDepth(orderBook) {
        const { bids, asks } = orderBook;
        const zones = [];
        let totalBidVolume = 0;
        let totalAskVolume = 0;

        const priceBuckets = this._aggregateBuckets(bids, asks);

        for (const bucket of priceBuckets) {
            const ratio = bucket.bidVol / (bucket.askVol || 1);
            const reverseRatio = bucket.askVol / (bucket.bidVol || 1);

            if (ratio > this.imbalanceThreshold || reverseRatio > this.imbalanceThreshold) {
                zones.push({
                    priceRange: bucket.range,
                    bidVol: bucket.bidVol,
                    askVol: bucket.askVol,
                    ratio: ratio,
                    type: ratio > reverseRatio ? 'SUPPORT_IMBALANCE' : 'RESISTANCE_IMBALANCE',
                    severity: Math.max(ratio, reverseRatio)
                });
            }

            totalBidVolume += bucket.bidVol;
            totalAskVolume += bucket.askVol;
        }

        return {
            zones,
            criticalImbalance: zones.length > 0,
            totalBidVolume,
            totalAskVolume
        };
    }

    _aggregateBuckets(bids, asks) {
        const buckets = new Map();
        const roundTo = (val) => Math.floor(val * 100) / 100;

        bids.forEach(([price, volume]) => {
            const p = roundTo(price);
            const current = buckets.get(p) || { bidVol: 0, askVol: 0, range: p };
            current.bidVol += volume;
            buckets.set(p, current);
        });

        asks.forEach(([price, volume]) => {
            const p = roundTo(price);
            const current = buckets.get(p) || { bidVol: 0, askVol: 0, range: p };
            current.askVol += volume;
            buckets.set(p, current);
        });

        return Array.from(buckets.values()).sort((a, b) => b.range - a.range);
    }

    async _fetchOrderBook(assetId) {
        return {
            bids: Array.from({ length: 20 }, (_, i) => [100 - i * 0.1, 0 * 50]),
            asks: Array.from({ length: 20 }, (_, i) => [100 + i * 0.1, 0 * 10])
        };
    }
}

module.exports = new EmergentMarket();