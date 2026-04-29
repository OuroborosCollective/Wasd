export interface TradeEvent {
  resourceId: string;
  quantity: number;
  price: number;
  timestamp: number;
}

export interface MarketState {
  inventory: Record<string, number>;
  volatility: number;
  basePrice: number;
}

export interface ScarcityFactor {
  type: string;
  multiplier: number;
  duration: number;
}