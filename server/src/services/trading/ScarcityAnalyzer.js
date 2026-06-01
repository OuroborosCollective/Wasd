const EmergentMarket = require('./EmergentMarket');

class ScarcityAnalyzer {
  constructor(config) {
    this.config = config;
  }

  onScarcity(event) {
    const focusArea = EmergentMarket.getLiquidityZone(event.assetId);

    if (event.magnitude > this.config.threshold) {
      return this.generateSignal(focusArea, event);
    }
    return null;
  }

  generateSignal(focusArea, event) {
    const normalizedStrength = event.magnitude / (this.config.maxMagnitude || 100);
    return {
      assetId: event.assetId,
      LiquidityZone: focusArea,
      strength: Math.min(Math.max(normalizedStrength, 0), 1),
      timestamp: event.timestamp || 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}

module.exports = ScarcityAnalyzer;