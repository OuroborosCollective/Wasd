/**
 * ARE-Trader Main Exports
 * 
 * Exports all public API for the tick pipeline module
 */

export { TickBuffer } from './server/tick-buffer';
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

// Re-export type-only types
export type {
  CryptoTick,
  NormalizedTick,
  TickWindowState,
  ChainString,
  TickPipelineConfig,
  RSIResult,
  MACDResult,
  IndicatorResult
} from './logic/indicators';

export type {
  PipelineEvent as PipelineEventType,
  SymbolState as PipelineSymbolState,
  PipelineState as PipelineStateType
} from './server/tick-pipeline';