/**
 * ARE-Trader Deterministic Tick Pipeline
 * 
 * Collects crypto price ticks from Websocket sources (Binance/Kraken),
 * normalizes using kappaPos integer scaling, and compiles state chains
 * for O(1) frontend lookups.
 * 
 * No floating-point drift for RSI/MACD indicator calculations.
 * 
 * ARE Determinism: Uses tickCount for timestamps, no Date.now, no Math.random.
 */

import { EventEmitter } from 'events';

/**
 * Raw tick from crypto exchange
 */
export interface CryptoTick {
  symbol: string;      // e.g., "BTCUSDT"
  price: number;        // Raw price from exchange
  timestamp: number;    // Deterministic tick-derived timestamp (not wall-clock)
  exchange: 'binance' | 'kraken';
  volume?: number;
  tickCount?: number;  // Deterministic tick counter for ARE synchronization
}

/**
 * Normalized tick using kappaPos integer scaling
 * priceScaled = Math.round(price * KAPPA_POS)
 */
export interface NormalizedTick {
  symbol: string;
  priceScaled: number;  // price * KAPPA_POS (integer)
  timestamp: number;
  tickCount: number;
  exchange: 'binance' | 'kraken';
}

/**
 * Aggregated state for a 100ms tick window
 */
export interface TickWindowState {
  symbol: string;
  windowIndex: number; // floor(timestamp / 100ms)
  openScaled: number;
  highScaled: number;
  lowScaled: number;
  closeScaled: number;
  tickCount: number;
  lastTimestamp: number;
}

/**
 * Compiled chain string for O(1) lookup
 * Format: "O{open}|H{high}|L{low}|C{close}|N{tickCount}"
 */
export type ChainString = string;

/**
 * Configuration for tick pipeline
 */
export interface TickPipelineConfig {
  /** kappaPos scaling factor (default: 100000 for 5 decimal precision) */
  kappaPos: number;
  /** Tick window interval in ms (default: 100ms = 10Hz) */
  windowIntervalMs: number;
  /** Supported symbols */
  symbols: string[];
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: TickPipelineConfig = {
  kappaPos: 100000,        // 5 decimal places precision
  windowIntervalMs: 100,   // 100ms = 10 Hz
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT']
};

/**
 * Event types emitted by TickPipeline
 */
export enum TickEventType {
  TICK_RECEIVED = 'tick',
  WINDOW_COMPILED = 'window',
  STATE_UPDATED = 'state'
}

/**
 * Core tick buffer that collects ticks in fixed 100ms windows
 * Uses kappaPos integer scaling to prevent floating-point drift
 * 
 * ARE Determinism: All timestamps derived from tick count, no Date.now.
 */
export class TickBuffer extends EventEmitter {
  private config: TickPipelineConfig;
  private windowBuffers: Map<string, TickWindowState> = new Map();
  private pendingTicks: Map<string, CryptoTick[]> = new Map();
  private lastWindowIndex: number = 0;
  private currentTickCount: number = 0;

  constructor(config: Partial<TickPipelineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Initialize with tick count 0, not Date.now()
    this.currentTickCount = 0;
    this.lastWindowIndex = 0;
  }

  /**
   * Get the current deterministic tick count
   */
  getTickCount(): number {
    return this.currentTickCount;
  }

  /**
   * Increment tick count (called by pipeline on each incoming tick)
   */
  incrementTickCount(): number {
    this.currentTickCount++;
    return this.currentTickCount;
  }

  /**
   * Calculate window index from timestamp
   * windowIndex = floor(timestamp / windowIntervalMs)
   */
  getWindowIndex(timestamp: number): number {
    return Math.floor(timestamp / this.config.windowIntervalMs);
  }

  /**
   * Get kappaPos scaling factor
   */
  getKappaPos(): number {
    return this.config.kappaPos;
  }

  /**
   * Normalize price using kappaPos integer scaling
   * Returns integer to prevent floating-point drift
   */
  normalizePrice(price: number): number {
    return Math.round(price * this.config.kappaPos);
  }

  /**
   * Denormalize price (for display/debugging)
   */
  denormalizePrice(priceScaled: number): number {
    return priceScaled / this.config.kappaPos;
  }

  /**
   * Add a raw tick to the buffer
   */
  addTick(tick: CryptoTick): void {
    if (!this.config.symbols.includes(tick.symbol)) {
      return; // Ignore unsupported symbols
    }

    const windowIndex = this.getWindowIndex(tick.timestamp);
    const key = `${tick.symbol}:${windowIndex}`;

    let windowState = this.windowBuffers.get(key);
    
    if (!windowState) {
      windowState = this.createWindowState(tick.symbol, windowIndex);
      this.windowBuffers.set(key, windowState);
    }

    // Normalize incoming price using kappaPos
    const priceScaled = this.normalizePrice(tick.price);

    // Update OHLC values
    if (windowState.tickCount === 0) {
      windowState.openScaled = priceScaled;
      windowState.highScaled = priceScaled;
      windowState.lowScaled = priceScaled;
    } else {
      if (priceScaled > windowState.highScaled) {
        windowState.highScaled = priceScaled;
      }
      if (priceScaled < windowState.lowScaled) {
        windowState.lowScaled = priceScaled;
      }
    }

    windowState.closeScaled = priceScaled;
    windowState.tickCount++;
    windowState.lastTimestamp = tick.timestamp;

    this.emit(TickEventType.TICK_RECEIVED, tick, windowState);
  }

  /**
   * Create new window state for a symbol/windowIndex
   */
  private createWindowState(symbol: string, windowIndex: number): TickWindowState {
    return {
      symbol,
      windowIndex,
      openScaled: 0,
      highScaled: 0,
      lowScaled: 0,
      closeScaled: 0,
      tickCount: 0,
      lastTimestamp: 0
    };
  }

  /**
   * Get compiled chain string for O(1) lookup
   * Format: "O{open}|H{high}|L{low}|C{close}|N{tickCount}"
   */
  compileChain(windowState: TickWindowState): ChainString {
    return `O${windowState.openScaled}|H${windowState.highScaled}|L${windowState.lowScaled}|C${windowState.closeScaled}|N${windowState.tickCount}`;
  }

  /**
   * Get current window state for a symbol
   */
  getCurrentWindowState(symbol: string): TickWindowState | undefined {
    const key = `${symbol}:${this.lastWindowIndex}`;
    return this.windowBuffers.get(key);
  }

  /**
   * Get chain string for a symbol at current window
   */
  getCurrentChain(symbol: string): ChainString | undefined {
    const windowState = this.getCurrentWindowState(symbol);
    if (!windowState) return undefined;
    return this.compileChain(windowState);
  }

  /**
   * Force compile current window and move to next
   * Call this when window interval has passed
   * 
   * ARE Determinism: Uses tickCount for timestamps, no Date.now
   */
  compileWindow(tickCount?: number): Map<string, ChainString> {
    const compiledChains = new Map<string, ChainString>();
    // Use deterministic tick count to derive window, not Date.now
    const currentTick = tickCount ?? this.currentTickCount;
    const newWindowIndex = this.getWindowIndexFromTick(currentTick);

    if (newWindowIndex > this.lastWindowIndex) {
      // Compile all active windows
      for (const [key, windowState] of this.windowBuffers) {
        const chain = this.compileChain(windowState);
        const symbol = windowState.symbol;
        compiledChains.set(symbol, chain);
        this.emit(TickEventType.WINDOW_COMPILED, windowState, chain);
      }

      // Clean up old windows (keep only last 2 windows for potential lookups)
      this.cleanupOldWindows(this.lastWindowIndex);
      
      this.lastWindowIndex = newWindowIndex;
    }

    return compiledChains;
  }

  /**
   * Calculate window index from tick count
   * windowIndex = floor(tickCount / (windowIntervalMs / 1000 * 10))
   * Since 100ms = 10 ticks at 10Hz
   */
  getWindowIndexFromTick(tickCount: number): number {
    const ticksPerWindow = Math.floor(this.config.windowIntervalMs / 100) * 10;
    return Math.floor(tickCount / ticksPerWindow);
  }

  /**
   * Clean up windows older than the specified index
   */
  private cleanupOldWindows(beforeIndex: number): void {
    for (const [key, windowState] of this.windowBuffers) {
      if (windowState.windowIndex < beforeIndex - 1) {
        this.windowBuffers.delete(key);
      }
    }
  }

  /**
   * Get all current window states
   */
  getAllWindowStates(): TickWindowState[] {
    return Array.from(this.windowBuffers.values());
  }

  /**
   * Get memory usage statistics
   */
  getStats(): { windowsCount: number; kappaPos: number; windowIntervalMs: number } {
    return {
      windowsCount: this.windowBuffers.size,
      kappaPos: this.config.kappaPos,
      windowIntervalMs: this.config.windowIntervalMs
    };
  }
}

/**
 * Default export for convenience
 */
export default TickBuffer;