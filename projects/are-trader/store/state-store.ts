/**
 * ARE-Trader State Store
 * 
 * Provides O(1) lookups for React frontend through
 * compiled chain strings from the tick pipeline.
 * 
 * ARE Determinism: All state derived from tick pipeline output, no Math.random, no Date.now.
 */

import { EventEmitter } from 'events';
import { 
  TickBuffer, 
  TickPipelineConfig, 
  DEFAULT_CONFIG, 
  ChainString, 
  TickWindowState,
  CryptoTick 
} from '../server/tick-buffer';
import { 
  TickPipeline, 
  createTickPipeline, 
  PipelineEvent, 
  PipelineState,
  SymbolState 
} from '../server/tick-pipeline';

/**
 * Store event types
 */
export enum StoreEvent {
  UPDATE = 'update',
  SYMBOL_UPDATE = 'symbolUpdate',
  READY = 'ready'
}

/**
 * Store configuration
 */
export interface StoreConfig {
  /** Symbols to track */
  symbols: string[];
  /** Auto-start pipeline on creation */
  autoStart: boolean;
}

/**
 * Default store configuration
 */
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'],
  autoStart: false
};

/**
 * In-memory state store with O(1) lookups
 * Stores compiled chain strings and aggregated state
 */
export class StateStore extends EventEmitter {
  private config: StoreConfig;
  private state: Record<string, SymbolState> = {};
  private lastUpdate: number = 0;
  private ready: boolean = false;
  
  constructor(config: Partial<StoreConfig> = {}) {
    super();
    this.config = { ...DEFAULT_STORE_CONFIG, ...config };
    this.initializeState();
  }

  /**
   * Initialize empty state for all symbols
   */
  private initializeState(): void {
    for (const symbol of this.config.symbols) {
      this.state[symbol] = {
        symbol,
        chain: '' as ChainString,
        priceScaled: 0,
        lastUpdate: 0,
        exchange: 'binance'
      };
    }
  }

  /**
   * Update state from pipeline
   */
  updateFromPipeline(pipelineState: PipelineState): void {
    for (const [symbol, pipelineSymbolState] of Object.entries(pipelineState.symbols)) {
      if (this.config.symbols.includes(symbol)) {
        this.state[symbol] = pipelineSymbolState;
      }
    }

    this.lastUpdate = pipelineState.compiledAt;
    this.ready = true;
    
    this.emit(StoreEvent.UPDATE, this.state);
    
    // Emit individual symbol updates
    for (const [symbol, symbolState] of Object.entries(this.state)) {
      this.emit(StoreEvent.SYMBOL_UPDATE, symbol, symbolState);
    }
  }

  /**
   * Get chain string for O(1) lookup
   * Format: "O{open}|H{high}|L{low}|C{close}|N{tickCount}"
   */
  getChain(symbol: string): ChainString | undefined {
    return this.state[symbol]?.chain;
  }

  /**
   * Get all chains as record for batch lookups
   */
  getAllChains(): Record<string, ChainString> {
    const chains: Record<string, ChainString> = {};
    for (const [symbol, symbolState] of Object.entries(this.state)) {
      if (symbolState.chain) {
        chains[symbol] = symbolState.chain;
      }
    }
    return chains;
  }

  /**
   * Get symbol state
   */
  getSymbolState(symbol: string): SymbolState | undefined {
    return this.state[symbol];
  }

  /**
   * Get all symbol states
   */
  getAllStates(): Record<string, SymbolState> {
    return { ...this.state };
  }

  /**
   * Parse chain string to get individual OHLC values
   * Format: "O{open}|H{high}|L{low}|C{close}|N{tickCount}"
   */
  parseChain(chain: ChainString): {
    open: number;
    high: number;
    low: number;
    close: number;
    tickCount: number;
  } | undefined {
    if (!chain || typeof chain !== 'string') return undefined;
    
    const parts = chain.split('|');
    if (parts.length !== 5) return undefined;

    const result: Record<string, number> = {};
    for (const part of parts) {
      const [key, value] = part.split('');
      if (key === 'O') result.open = parseInt(value, 10);
      else if (key === 'H') result.high = parseInt(value, 10);
      else if (key === 'L') result.low = parseInt(value, 10);
      else if (key === 'C') result.close = parseInt(value, 10);
      else if (key === 'N') result.tickCount = parseInt(value, 10);
    }

    if (!result.open || !result.high || !result.low || !result.close) {
      return undefined;
    }

    return result as {
      open: number;
      high: number;
      low: number;
      close: number;
      tickCount: number;
    };
  }

  /**
   * Get denormalized price (for display)
   */
  getDenormalizedPrice(symbol: string, kappaPos: number = 100000): number {
    const chain = this.getChain(symbol);
    if (!chain) return 0;

    const parsed = this.parseChain(chain);
    if (!parsed) return 0;

    return parsed.close / kappaPos;
  }

  /**
   * Get price change from open to close in current window
   */
  getPriceChange(symbol: string, kappaPos: number = 100000): number {
    const chain = this.getChain(symbol);
    if (!chain) return 0;

    const parsed = this.parseChain(chain);
    if (!parsed) return 0;

    return (parsed.close - parsed.open) / kappaPos;
  }

  /**
   * Get tick count for a symbol
   */
  getTickCount(symbol: string): number {
    const chain = this.getChain(symbol);
    if (!chain) return 0;

    const parsed = this.parseChain(chain);
    return parsed?.tickCount ?? 0;
  }

  /**
   * Check if store has data for a symbol
   */
  hasData(symbol: string): boolean {
    const chain = this.getChain(symbol);
    return chain !== undefined && chain !== '';
  }

  /**
   * Check if store is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate(): number {
    return this.lastUpdate;
  }

  /**
   * Get store configuration
   */
  getConfig(): StoreConfig {
    return { ...this.config };
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.initializeState();
    this.lastUpdate = 0;
    this.ready = false;
    this.emit(StoreEvent.UPDATE, this.state);
  }
}

/**
 * Factory to create a state store
 */
export function createStateStore(config?: Partial<StoreConfig>): StateStore {
  return new StateStore(config);
}

/**
 * Default export
 */
export default StateStore;