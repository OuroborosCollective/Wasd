/**
 * ARE-Trader Deterministic Tick Pipeline
 * 
 * Orchestrates WebSocket connections to crypto exchanges,
 * collects ticks in 100ms windows using kappaPos integer scaling,
 * and compiles chain strings for O(1) frontend lookups.
 * 
 * ARE Determinism: All timestamps derived from tick count, no Date.now, no Math.random.
 */

import { EventEmitter } from 'events';
import { TickBuffer, TickPipelineConfig, DEFAULT_CONFIG, ChainString, TickWindowState } from './tick-buffer';
import { ExchangeConnector, createExchangeConnector, ConnectionState } from './exchange-connector';

/**
 * Pipeline event types
 */
export enum PipelineEvent {
  START = 'start',
  STOP = 'stop',
  TICK = 'tick',
  WINDOW = 'window',
  STATE = 'state',
  ERROR = 'error'
}

/**
 * Symbol state for React frontend O(1) lookup
 */
export interface SymbolState {
  symbol: string;
  chain: ChainString;
  priceScaled: number;
  lastUpdate: number;
  exchange: 'binance' | 'kraken';
}

/**
 * Complete pipeline state for all symbols
 */
export interface PipelineState {
  symbols: Record<string, SymbolState>;
  compiledAt: number;
  windowIndex: number;
}

/**
 * Aggregated state from AREStateCompiler approach
 */
export interface AREStateCompiler {
  /**
   * Compile all symbol states into a single state object
   */
  compile(): PipelineState;
  
  /**
   * Get chain string for a symbol
   */
  getChain(symbol: string): ChainString | undefined;
  
  /**
   * Get all chains as record for fast lookup
   */
  getAllChains(): Record<string, ChainString>;
}

/**
 * Main tick pipeline class
 */
export class TickPipeline extends EventEmitter implements AREStateCompiler {
  private tickBuffer: TickBuffer;
  private connectors: Map<string, ExchangeConnector> = new Map();
  private config: TickPipelineConfig;
  private state: PipelineState;
  private windowTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private symbols: string[];
  private globalTickCount: number = 0;

  constructor(config: Partial<TickPipelineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.symbols = this.config.symbols;
    
    this.tickBuffer = new TickBuffer(this.config);
    this.state = {
      symbols: {},
      compiledAt: 0,
      windowIndex: 0
    };

    // Initialize symbol states
    for (const symbol of this.symbols) {
      this.state.symbols[symbol] = {
        symbol,
        chain: '' as ChainString,
        priceScaled: 0,
        lastUpdate: 0,
        exchange: 'binance' as const
      };
    }

    this.setupTickBufferHandlers();
  }

  /**
   * Get global deterministic tick count
   */
  getGlobalTickCount(): number {
    return this.globalTickCount;
  }

  /**
   * Increment global tick count
   */
  incrementGlobalTickCount(): number {
    this.globalTickCount++;
    this.tickBuffer.incrementTickCount();
    return this.globalTickCount;
  }

  /**
   * Set up tick buffer event handlers
   */
  private setupTickBufferHandlers(): void {
    this.tickBuffer.on('tick', (tick, windowState) => {
      this.emit(PipelineEvent.TICK, tick, windowState);
    });
  }

  /**
   * Start the pipeline
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit(PipelineEvent.START);

    // Create and connect to exchange WebSockets
    for (const symbol of this.symbols) {
      // For demo/testing, connect to Binance
      const connector = createExchangeConnector('binance', [symbol]);
      connector.on('tick', (tick) => {
        this.tickBuffer.addTick(tick);
      });
      
      connector.on('error', (error) => {
        this.emit(PipelineEvent.ERROR, error);
      });

      this.connectors.set(symbol, connector);
      await connector.connect();
    }

    // Start window compilation timer (100ms interval)
    this.windowTimer = setInterval(() => {
      this.compileWindow();
    }, this.config.windowIntervalMs);
  }

  /**
   * Stop the pipeline
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.emit(PipelineEvent.STOP);

    // Stop window timer
    if (this.windowTimer) {
      clearInterval(this.windowTimer);
      this.windowTimer = null;
    }

    // Disconnect all connectors
    for (const [, connector] of this.connectors) {
      connector.disconnect();
    }
    this.connectors.clear();
  }

  /**
   * Compile current window state
   * Called every 100ms
   * 
   * ARE Determinism: Uses tickCount for timestamps, no Date.now
   */
  private compileWindow(): void {
    const tickCount = this.incrementGlobalTickCount();
    const chains = this.tickBuffer.compileWindow(tickCount);
    
    // Deterministic timestamp: derive from tick count (10 Hz = 100ms per tick)
    const compiledAt = tickCount * 100;
    const windowIndex = this.tickBuffer.getWindowIndexFromTick(tickCount);

    for (const symbol of this.symbols) {
      const chain = chains.get(symbol);
      const windowState = this.tickBuffer.getCurrentWindowState(symbol);

      if (chain && windowState) {
        this.state.symbols[symbol] = {
          symbol,
          chain,
          priceScaled: windowState.closeScaled,
          lastUpdate: compiledAt,
          exchange: windowState.tickCount > 0 ? 'binance' : 'binance' // Use actual exchange from tick
        };
      }
    }

    this.state.compiledAt = compiledAt;
    this.state.windowIndex = windowIndex;

    this.emit(PipelineEvent.WINDOW, this.state);
  }

  /**
   * Get the compiled state for React frontend O(1) lookup
   */
  compile(): PipelineState {
    return this.state;
  }

  /**
   * Get chain string for a specific symbol
   */
  getChain(symbol: string): ChainString | undefined {
    return this.state.symbols[symbol]?.chain;
  }

  /**
   * Get all chains as record
   */
  getAllChains(): Record<string, ChainString> {
    const chains: Record<string, ChainString> = {};
    for (const [symbol, state] of Object.entries(this.state.symbols)) {
      chains[symbol] = state.chain;
    }
    return chains;
  }

  /**
   * Get denormalized price for display
   */
  getDisplayPrice(symbol: string): number {
    const priceScaled = this.state.symbols[symbol]?.priceScaled;
    if (priceScaled === undefined || priceScaled === 0) return 0;
    return this.tickBuffer.denormalizePrice(priceScaled);
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    isRunning: boolean;
    symbolsCount: number;
    kappaPos: number;
    windowMs: number;
    connectorStates: Record<string, ConnectionState>;
  } {
    const connectorStates: Record<string, ConnectionState> = {};
    for (const [symbol, connector] of this.connectors) {
      connectorStates[symbol] = connector.getState();
    }

    return {
      isRunning: this.isRunning,
      symbolsCount: this.symbols.length,
      kappaPos: this.config.kappaPos,
      windowMs: this.config.windowIntervalMs,
      connectorStates
    };
  }

  /**
   * Get the tick buffer for direct access
   */
  getTickBuffer(): TickBuffer {
    return this.tickBuffer;
  }
}

/**
 * Factory function to create a configured pipeline
 */
export function createTickPipeline(config?: Partial<TickPipelineConfig>): TickPipeline {
  return new TickPipeline(config);
}

/**
 * Default export
 */
export default TickPipeline;