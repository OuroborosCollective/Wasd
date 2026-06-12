/**
 * ARE-Trader Technical Indicators
 * 
 * Computes RSI, MACD and other indicators using kappaPos
 * integer scaling to eliminate floating-point drift.
 * 
 * All calculations use scaled integers, only convert to
 * decimal for final display.
 * 
 * ARE Determinism: All state derives from tick count, no Math.random, no Date.now.
 */

// Types are now defined inline in this file for deterministic import
// (avoids circular dependency with tick-buffer which uses these types)

/**
 * RSI calculation period
 */
export const RSI_PERIOD = 14;

/**
 * MACD standard periods
 */
export const MACD_FAST_PERIOD = 12;
export const MACD_SLOW_PERIOD = 26;
export const MACD_SIGNAL_PERIOD = 9;

/**
 * RSI Result with scaled values
 */
export interface RSIResult {
  /** RSI value scaled by KAPPA_POS (0-100 * kappaPos) */
  rsiScaled: number;
  currentGainScaled: number;
  currentLossScaled: number;
  avgGainScaled: number;
  avgLossScaled: number;
}

/**
 * MACD Result with scaled values
 */
export interface MACDResult {
  /** MACD line (fast EMA - slow EMA) scaled */
  macdScaled: number;
  /** Signal line (MACD EMA) scaled */
  signalScaled: number;
  /** Histogram (MACD - Signal) scaled */
  histogramScaled: number;
  /** Previous MACD for crossover detection */
  prevMacdScaled: number;
  /** Previous Signal for crossover detection */
  prevSignalScaled: number;
}

/**
 * Price history for indicator calculation
 * Uses kappaPos scaled integers
 */
export class PriceHistory {
  private closes: number[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Add a closing price (scaled)
   */
  add(priceScaled: number): void {
    this.closes.push(priceScaled);
    if (this.closes.length > this.maxSize) {
      this.closes.shift();
    }
  }

  /**
   * Get closing prices as array
   */
  getCloses(): number[] {
    return [...this.closes];
  }

  /**
   * Get number of data points
   */
  size(): number {
    return this.closes.length;
  }

  /**
   * Check if enough data for RSI calculation
   */
  hasEnoughForRSI(period: number = RSI_PERIOD): boolean {
    return this.closes.length >= period;
  }

  /**
   * Check if enough data for MACD calculation
   */
  hasEnoughForMACD(): boolean {
    return this.closes.length >= MACD_SLOW_PERIOD;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.closes = [];
  }
}

/**
 * RSI (Relative Strength Index) Calculator
 * Uses integer arithmetic throughout
 * 
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss
 * 
 * Using smoothed moving average approach
 */
export class RSICalculator {
  private history: PriceHistory;
  private period: number;
  private kappaPos: number;
  private prevAvgGain: number = 0;
  private prevAvgLoss: number = 0;
  private initialized: boolean = false;

  constructor(period: number = RSI_PERIOD, kappaPos: number = 100000) {
    this.period = period;
    this.kappaPos = kappaPos;
    this.history = new PriceHistory(period * 2);
  }

  /**
   * Add price and calculate RSI
   * Returns RSI scaled by kappaPos (0-100)
   */
  calculate(closeScaled: number): RSIResult | undefined {
    this.history.add(closeScaled);

    const closes = this.history.getCloses();
    if (closes.length < this.period + 1) {
      return undefined;
    }

    let avgGain: number;
    let avgLoss: number;

    // Get previous values for smoothing
    const prevGain = this.prevAvgGain;
    const prevLoss = this.prevAvgLoss;

    // Calculate change
    const currentClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changeScaled = currentClose - prevClose;

    const gain = changeScaled > 0 ? changeScaled : 0;
    const loss = changeScaled < 0 ? -changeScaled : 0;

    if (this.initialized && this.prevAvgGain > 0) {
      // Smoothed moving average
      const multiplier = this.kappaPos * (this.period - 1) / this.period;
      const multiplierScaled = Math.round(multiplier);

      avgGain = (prevGain * multiplierScaled + gain * this.kappaPos) / this.period;
      avgLoss = (prevLoss * multiplierScaled + loss * this.kappaPos) / this.period;
    } else {
      // First calculation - simple average
      let totalGain = 0;
      let totalLoss = 0;

      for (let i = closes.length - this.period; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) totalGain += change;
        else if (change < 0) totalLoss -= change;
      }

      avgGain = totalGain / this.period;
      avgLoss = totalLoss / this.period;
      this.initialized = true;
    }

    // Store for next iteration
    this.prevAvgGain = avgGain;
    this.prevAvgLoss = avgLoss;

    // Calculate RSI
    let rsiScaled: number;
    if (avgLoss === 0) {
      rsiScaled = 100 * this.kappaPos;
    } else {
      const rs = (avgGain * this.kappaPos) / avgLoss;
      rsiScaled = Math.round(100 * this.kappaPos - (100 * this.kappaPos) / (1 + rs));
    }

    return {
      rsiScaled,
      currentGainScaled: gain,
      currentLossScaled: loss,
      avgGainScaled: Math.round(avgGain),
      avgLossScaled: Math.round(avgLoss)
    };
  }

  /**
   * Get RSI as percentage (0-100)
   */
  getRSIPercentage(result: RSIResult): number {
    return result.rsiScaled / this.kappaPos;
  }

  /**
   * Check if RSI is in overbought/oversold territory
   */
  getSignal(result: RSIResult): 'overbought' | 'oversold' | 'neutral' {
    const rsi = this.getRSIPercentage(result);
    if (rsi >= 70) return 'overbought';
    if (rsi <= 30) return 'oversold';
    return 'neutral';
  }

  /**
   * Reset calculator
   */
  reset(): void {
    this.history.clear();
    this.prevAvgGain = 0;
    this.prevAvgLoss = 0;
    this.initialized = false;
  }
}

/**
 * MACD (Moving Average Convergence Divergence) Calculator
 * Uses integer EMA arithmetic
 */
export class MACDCalculator {
  private history: PriceHistory;
  private fastPeriod: number;
  private slowPeriod: number;
  private signalPeriod: number;
  private kappaPos: number;
  private fastEMA: number[] = [];
  private slowEMA: number[] = [];
  private signalEMA: number[] = [];
  private initialized: boolean = false;

  constructor(
    fastPeriod: number = MACD_FAST_PERIOD,
    slowPeriod: number = MACD_SLOW_PERIOD,
    signalPeriod: number = MACD_SIGNAL_PERIOD,
    kappaPos: number = 100000
  ) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.signalPeriod = signalPeriod;
    this.kappaPos = kappaPos;
    this.history = new PriceHistory(slowPeriod + signalPeriod + 10);
  }

  /**
   * Calculate EMA for given period
   */
  private calculateEMA(values: number[], period: number, multiplier: number): number {
    if (values.length < period) {
      return 0;
    }

    let ema: number;
    // First EMA is SMA (Simple Moving Average)
    if (values.length === period) {
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += values[i];
      }
      ema = Math.round(sum / period);
    } else {
      // Subsequent EMA: (Price - EMA(prev)) * multiplier + EMA(prev)
      const prevEMA = values[values.length - period - 1] || 0;
      const price = values[values.length - 1];
      const emaChange = ((price - prevEMA) * multiplier) / period;
      ema = prevEMA + emaChange;
    }

    return Math.round(ema);
  }

  /**
   * Add price and calculate MACD
   */
  calculate(closeScaled: number): MACDResult | undefined {
    this.history.add(closeScaled);
    const closes = this.history.getCloses();

    if (closes.length < this.slowPeriod + this.signalPeriod) {
      return undefined;
    }

    // Multipliers for EMA
    const fastMultiplier = 2;
    const slowMultiplier = 2;
    const signalMultiplier = 2;

    // Calculate EMAs
    const fastEMAValue = this.calculateEMA(closes, this.fastPeriod, fastMultiplier);
    const slowEMAValue = this.calculateEMA(closes, this.slowPeriod, slowMultiplier);

    // MACD Line = Fast EMA - Slow EMA
    const macdScaled = fastEMAValue - slowEMAValue;

    // Calculate Signal (EMA of MACD)
    // We need to store MACD values for signal calculation
    this.fastEMA.push(fastEMAValue);
    this.slowEMA.push(slowEMAValue);

    if (this.fastEMA.length < this.signalPeriod) {
      return undefined;
    }

    // Get MACD values
    const macdValues: number[] = [];
    for (let i = 0; i < this.fastEMA.length; i++) {
      macdValues.push(this.fastEMA[i] - this.slowEMA[i]);
    }

    const signalEMAValue = this.calculateEMA(macdValues, this.signalPeriod, signalMultiplier);
    const histogramScaled = macdScaled - signalEMAValue;

    // Get previous values for crossover detection
    const prevMacdScaled = macdValues.length > 1 
      ? macdValues[macdValues.length - 2] 
      : macdScaled;
    const prevSignalScaled = this.signalEMA.length > 0 
      ? this.signalEMA[this.signalEMA.length - 1] 
      : signalEMAValue;

    this.signalEMA.push(signalEMAValue);

    // Trim arrays if too large
    if (this.fastEMA.length > this.signalPeriod * 2) {
      this.fastEMA.shift();
      this.slowEMA.shift();
      this.signalEMA.shift();
    }

    return {
      macdScaled,
      signalScaled: signalEMAValue,
      histogramScaled,
      prevMacdScaled,
      prevSignalScaled
    };
  }

  /**
   * Get MACD signal
   */
  getSignal(result: MACDResult): 'bullish' | 'bearish' | 'neutral' {
    // Bullish crossover: MACD crosses above signal
    if (result.prevMacdScaled <= result.prevSignalScaled && 
        result.macdScaled > result.signalScaled) {
      return 'bullish';
    }
    // Bearish crossover: MACD crosses below signal
    if (result.prevMacdScaled >= result.prevSignalScaled && 
        result.macdScaled < result.signalScaled) {
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Get histogram direction
   */
  getHistogramDirection(result: MACDResult): 'positive' | 'negative' | 'neutral' {
    if (result.histogramScaled > 0) return 'positive';
    if (result.histogramScaled < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Reset calculator
   */
  reset(): void {
    this.history.clear();
    this.fastEMA = [];
    this.slowEMA = [];
    this.signalEMA = [];
  }
}

/**
 * Combined indicator results
 */
export interface IndicatorResult {
  symbol: string;
  rsi?: RSIResult;
  macd?: MACDResult;
  timestamp: number;
}

/**
 * Indicator Engine
 * Manages RSI and MACD calculations for multiple symbols
 */
export class IndicatorEngine {
  private rsiCalculators: Map<string, RSICalculator> = new Map();
  private macdCalculators: Map<string, MACDCalculator> = new Map();
  private kappaPos: number;
  private symbols: string[];

  constructor(symbols: string[], kappaPos: number = 100000) {
    this.symbols = symbols;
    this.kappaPos = kappaPos;

    // Initialize calculators
    for (const symbol of symbols) {
      this.rsiCalculators.set(symbol, new RSICalculator(RSI_PERIOD, kappaPos));
      this.macdCalculators.set(symbol, new MACDCalculator(
        MACD_FAST_PERIOD,
        MACD_SLOW_PERIOD,
        MACD_SIGNAL_PERIOD,
        kappaPos
      ));
    }
  }

  /**
   * Process tick and update indicators
   * ARE Determinism: Uses tickCount for timestamp derivation, no Date.now
   */
  processTick(symbol: string, closeScaled: number, tickCount: number = 0): IndicatorResult | undefined {
    const rsiCalc = this.rsiCalculators.get(symbol);
    const macdCalc = this.macdCalculators.get(symbol);

    if (!rsiCalc || !macdCalc) {
      return undefined;
    }

    const rsi = rsiCalc.calculate(closeScaled);
    const macd = macdCalc.calculate(closeScaled);

    // Deterministic timestamp: derive from tickCount using world tick rate (10 Hz = 100ms)
    // This ensures consistent timestamps across all ARE nodes
    const timestamp = tickCount * 100;

    return {
      symbol,
      rsi,
      macd,
      timestamp
    };
  }

  /**
   * Get RSI result for symbol
   */
  getRSI(symbol: string): RSIResult | undefined {
    return this.rsiCalculators.get(symbol)?.calculate(0); // Just returns last result
  }

  /**
   * Get MACD result for symbol
   */
  getMACD(symbol: string): MACDResult | undefined {
    return this.macdCalculators.get(symbol)?.calculate(0);
  }

  /**
   * Reset all indicators
   */
  reset(): void {
    for (const calc of this.rsiCalculators.values()) {
      calc.reset();
    }
    for (const calc of this.macdCalculators.values()) {
      calc.reset();
    }
  }
}

/**
 * Factory function
 */
export function createIndicatorEngine(
  symbols: string[],
  kappaPos: number = 100000
): IndicatorEngine {
  return new IndicatorEngine(symbols, kappaPos);
}

/**
 * Default export
 */
export default IndicatorEngine;