export interface ScarcityEvent {
    regionId: string;
    resourceType: string;
    priceDelta: number;
    coordinates: {
        x: number;
        y: number;
    };
}

export interface MarketShiftData {
    regionId: string;
    resourceType: string;
    priceDelta: number;
    coordinates: {
        x: number;
        y: number;
    };
}