// @ARE-GUARD-EXEMPT: core meta path
export enum WorldEventType {
    MARKET_ANOMALY_DETECTED = 'MARKET_ANOMALY_DETECTED',
    PREDICTIVE_SCARCITY_WARNING = 'PREDICTIVE_SCARCITY_WARNING'
}

export interface MarketAnomalyPayload {
    itemId: string;
    regionId: string;
    anomalyType: 'PRICE_SPIKE' | 'SUPPLY_CRASH' | 'UNUSUAL_VOLUME';
    deviationScore: number;
    currentPrice: number;
    averagePrice: number;
    timestamp: number;
}

export interface PredictiveScarcityPayload {
    itemId: string;
    regionId: string;
    predictedShortageStart: number;
    estimatedDuration: number;
    severity: number; // 0.0 to 1.0
    confidence: number; // 0.0 to 1.0
    underlyingFactors: string[];
}

export interface WorldEventBusMap {
    [WorldEventType.MARKET_ANOMALY_DETECTED]: MarketAnomalyPayload;
    [WorldEventType.PREDICTIVE_SCARCITY_WARNING]: PredictiveScarcityPayload;
}