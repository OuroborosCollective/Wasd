/**
 * ARE-Trader Main Exports
 * 
 * Exports all public API for the tick pipeline module
 */

// Class and value exports from server modules
export { TickBuffer, DEFAULT_CONFIG } from './server/tick-buffer';
export { 
  TickPipeline, 
  createTickPipeline,
  PipelineEvent,
  PipelineState,
  SymbolState,
  AREStateCompiler
} from './server/tick-pipeline';

export { 
  ExchangeConnector, 
  createExchangeConnector,
  ConnectionState,
  BINANCE_WS_URL,
  KRAKEN_WS_URL
} from './server/exchange-connector';

export { StateStore, createStateStore, StoreEvent } from './store/state-store';
export type { StoreConfig } from './store/state-store';

export { 
  IndicatorEngine,
  RSICalculator,
  MACDCalculator,
  RSI_PERIOD,
  MACD_FAST_PERIOD,
  MACD_SLOW_PERIOD,
  MACD_SIGNAL_PERIOD,
  createIndicatorEngine,
  PriceHistory
} from './logic/indicators';

// Re-export type-only exports from their canonical locations
export type {
  RSIResult,
  MACDResult,
  IndicatorResult
} from './logic/indicators';

export type {
  CryptoTick,
  NormalizedTick,
  TickWindowState,
  ChainString,
  TickPipelineConfig
} from './server/tick-buffer';

export type {
  PipelineEvent as PipelineEventType,
  SymbolState as PipelineSymbolState,
  PipelineState as PipelineStateType
} from './server/tick-pipeline';