export interface Resource {
  id: string;
  name: string;
  baseValue: number;
}

export interface MarketData {
  resourceId: string;
  currentPrice: number;
  lastPrice: number;
  volume24h: number;
  supply: number;
}

export interface AgentState {
  balance: number;
  inventory: Map<string, number>;
  riskTolerance: number; // 0.0 to 1.0
  targetInventoryLevels: Map<string, number>;
}

export interface EconomicDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  resourceId: string;
  amount: number;
  price: number;
  priority: number; // 0.0 to 1.0
  reason: string;
}

export class EconomicDecisionEngine {
  public calculateUtility(
    resourceId: string,
    currentPrice: number,
    state: AgentState
  ): number {
    const currentStock = state.inventory.get(resourceId) || 0;
    const targetStock = state.targetInventoryLevels.get(resourceId) || 10;
    
    // Scarcity factor: higher utility if stock is below target
    const scarcity = Math.max(0, (targetStock - currentStock) / targetStock);
    
    // Affordability factor: 1.0 if cheap relative to balance, 0.0 if too expensive
    const affordability = state.balance > currentPrice ? Math.min(1, state.balance / (currentPrice * 10)) : 0;
    
    return scarcity * 0.7 + affordability * 0.3;
  }

  public getDecision(
    resourceId: string,
    market: MarketData,
    state: AgentState
  ): EconomicDecision {
    const currentStock = state.inventory.get(resourceId) || 0;
    const targetStock = state.targetInventoryLevels.get(resourceId) || 10;
    const utility = this.calculateUtility(resourceId, market.currentPrice, state);

    // Trend analysis
    const priceChange = (market.currentPrice - market.lastPrice) / market.lastPrice;
    
    // Logic for Buying
    if (currentStock < targetStock && market.currentPrice < (market.lastPrice * (1 + state.riskTolerance))) {
      if (state.balance >= market.currentPrice) {
        return {
          action: 'BUY',
          resourceId,
          amount: Math.min(targetStock - currentStock, Math.floor(state.balance / market.currentPrice)),
          price: market.currentPrice,
          priority: utility,
          reason: `Inventory low (${currentStock}/${targetStock}) and price is acceptable.`
        };
      }
    }

    // Logic for Selling
    if (currentStock > 0) {
      const profitMargin = 0.15 + (1 - state.riskTolerance) * 0.2;
      const expectedMinSellPrice = market.lastPrice * (1 + profitMargin);

      if (market.currentPrice >= expectedMinSellPrice || currentStock > targetStock * 2) {
        return {
          action: 'SELL',
          resourceId,
          amount: currentStock > targetStock ? currentStock - targetStock : Math.ceil(currentStock * 0.5),
          price: market.currentPrice,
          priority: currentStock > targetStock ? 0.8 : 0.4,
          reason: market.currentPrice >= expectedMinSellPrice ? 'Target profit reached.' : 'Excess inventory liquidation.'
        };
      }
    }

    return {
      action: 'HOLD',
      resourceId,
      amount: 0,
      price: market.currentPrice,
      priority: 0.1,
      reason: 'No favorable market conditions met.'
    };
  }

  public getBestAction(
    availableResources: Resource[],
    marketMap: Map<string, MarketData>,
    state: AgentState
  ): EconomicDecision {
    const decisions = availableResources.map(res => {
      const market = marketMap.get(res.id);
      if (!market) return null;
      return this.getDecision(res.id, market, state);
    }).filter(d => d !== null) as EconomicDecision[];

    if (decisions.length === 0) {
      return { action: 'HOLD', resourceId: '', amount: 0, price: 0, priority: 0, reason: 'No market data' };
    }

    return decisions.reduce((prev, current) => (prev.priority > current.priority) ? prev : current);
  }
}