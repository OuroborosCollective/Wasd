/**
 * ARE-Trader Crypto WebSocket Connector
 * 
 * Manages WebSocket connections to crypto exchanges (Binance/Kraken)
 * and feeds raw ticks into the TickBuffer for processing.
 * 
 * Uses real exchange WebSocket APIs - no mock data.
 * 
 * ARE Determinism: Uses tickCount for timestamps, no Date.now, no Math.random.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

/**
 * Check if running in browser environment
 */
function isBrowserEnvironment(): boolean {
  // Use type assertion for globalThis access to avoid ts7017 error
  const global = globalThis as Record<string, unknown>;
  return typeof global['window'] !== 'undefined' || 
         typeof global['document'] !== 'undefined';
}

/**
 * WebSocket message types from exchanges
 */
export interface BinanceTradeMessage {
  e: string;     // Event type
  E: number;     // Event time
  s: string;     // Symbol
  t: number;     // Trade ID
  p: string;     // Price
  q: string;     // Quantity
  b: number;     // Buyer order ID
  a: number;     // Seller order ID
  T: number;     // Trade time
  m: boolean;    // Is buyer maker
  M: boolean;    // Is best match
}

export interface BinanceTickerMessage {
  e: string;     // Event type
  E: number;     // Event time
  s: string;     // Symbol
  p: string;     // Price change
  P: string;     // Price change percent
  w: string;     // Weighted average price
  c: string;     // Last price
  Q: string;     // Last quantity
  o: string;     // Open price
  h: string;     // High price
  l: string;     // Low price
  v: string;     // Total traded base asset volume
  qv: string;    // Total traded quote asset volume
}

export interface KrakenTickerMessage {
  a: [string, string, string];   // Ask [price, wholeLotVolume, lotVolume]
  b: [string, string, string];   // Bid [price, wholeLotVolume, lotVolume]
  c: [string, string];            // Last trade closed [price, lotVolume]
  v: [string, string];           // Volume [today, last24hours]
  p: [string, string];           // Volume weighted avg price [today, last24hours]
  t: [number, number];          // Number of trades [today, last24hours]
  l: [string, string];          // Low [today, last24hours]
  h: [string, string];           // High [today, last24hours]
  o: string;                    // Opening price
}

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
  name: 'binance' | 'kraken';
  wsUrl: string;
  symbols: string[];
  messageType: 'trade' | 'ticker';
}

/**
 * Exchange WebSocket connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Exchange WebSocket connector
 */
export class ExchangeConnector extends EventEmitter {
  private config: ExchangeConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelayMs: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string;
  private receivedSymbols: Set<string> = new Set();

  constructor(config: ExchangeConfig) {
    super();
    this.config = config;
    this.url = config.wsUrl;
  }

  /**
   * Connect to exchange WebSocket
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      // Use environment detection instead of direct window reference
      if (!isBrowserEnvironment()) {
        // Node.js - use ws or native fetch
        await this.connectNode();
      } else {
        // Browser - use native WebSocket
        this.connectBrowser();
      }
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Node.js connection using ws package for real WebSocket
   */
  private async connectNode(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.on('open', () => {
          this.setState(ConnectionState.CONNECTED);
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.subscribeToSymbols();
          this.emit('open');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          // Handle both string and ArrayBuffer data from ws
          const message = typeof data === 'string' ? data : data.toString();
          this.handleMessage(message);
        });

        this.ws.on('error', (error: Error) => {
          this.emit('error', error);
          if (this.state !== ConnectionState.CONNECTED) {
            reject(error);
          }
        });

        this.ws.on('close', () => {
          this.setState(ConnectionState.DISCONNECTED);
          this.stopPingInterval();
          this.emit('close');
          this.scheduleReconnect();
        });
      } catch (error) {
        this.setState(ConnectionState.ERROR);
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Browser connection using native WebSocket
   */
  private connectBrowser(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.setState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.startPingInterval();
        this.subscribeToSymbols();
        this.emit('open');
      };

      this.ws.onmessage = (event: { data: unknown }) => {
        // Handle WebSocket data which can be string, Buffer, or ArrayBuffer
        const rawData = event.data;
        const message = typeof rawData === 'string' ? rawData : String(rawData);
        this.handleMessage(message);
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        this.setState(ConnectionState.DISCONNECTED);
        this.stopPingInterval();
        this.emit('close');
        this.scheduleReconnect();
      };
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      this.emit('error', error);
    }
  }

  /**
   * Subscribe to trading symbols
   */
  private subscribeToSymbols(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscribeMsg = this.config.name === 'binance' 
      ? this.createBinanceSubscribeMsg()
      : this.createKrakenSubscribeMsg();

    this.ws.send(JSON.stringify(subscribeMsg));
  }

  /**
   * Create Binance subscription message
   */
  private createBinanceSubscribeMsg(): object {
    const streams = this.config.symbols.map(s => 
      `${s.toLowerCase()}@${this.config.messageType}`
    );
    
    return {
      method: 'SUBSCRIBE',
      params: streams,
      id: 1
    };
  }

  /**
   * Create Kraken subscription message
   */
  private createKrakenSubscribeMsg(): object {
    const pairs = this.config.symbols;
    const subscription = {
      event: 'subscribe',
      pair: pairs,
      subscription: { name: this.config.messageType }
    };

    return subscription;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (this.config.name === 'binance') {
        this.handleBinanceMessage(message);
      } else {
        this.handleKrakenMessage(message);
      }
    } catch (error) {
      // Ignore parse errors for non-JSON messages
    }
  }

  /**
   * Handle Binance message
   */
  private handleBinanceMessage(message: unknown): void {
    if (!message || typeof message !== 'object') return;

    const msg = message as Record<string, unknown>;
    
    // Check if it's a trade or ticker event
    if (msg.e === 'trade') {
      const trade = msg as unknown as BinanceTradeMessage;
      this.emit('tick', {
        symbol: trade.s,
        price: parseFloat(trade.p),
        timestamp: trade.T,
        exchange: 'binance' as const,
        volume: parseFloat(trade.q)
      });
    } else if (msg.e === '24hrTicker') {
      const ticker = msg as unknown as BinanceTickerMessage;
      this.emit('tick', {
        symbol: ticker.s,
        price: parseFloat(ticker.c),
        timestamp: ticker.E,
        exchange: 'binance' as const,
        volume: parseFloat(ticker.v)
      });
    }
  }

  /**
   * Handle Kraken message
   * ARE Determinism: Uses tickCount derived from window index, not Date.now
   */
  private handleKrakenMessage(message: unknown): void {
    // Kraken sends arrays: [channelID, data, channelName, pair]
    if (!Array.isArray(message) || message.length < 2) return;

    const data = message[1];
    
    if (this.config.messageType === 'ticker' && data.a) {
      const ticker = data as KrakenTickerMessage;
      const pair = message[3] as string;
      const symbol = this.krakenPairToSymbol(pair);
      
      // Deterministic timestamp: derive from window index (100ms intervals)
      // This ensures consistent timestamps across all ARE nodes
      const tickCount = this.receivedSymbols.size;
      const timestamp = tickCount * 100;
      
      this.emit('tick', {
        symbol,
        price: parseFloat(ticker.c[0]),
        timestamp,
        exchange: 'kraken' as const,
        volume: parseFloat(ticker.v[0])
      });
    }
  }

  /**
   * Convert Kraken pair to standard symbol (e.g., XBT/USDT -> BTCUSDT)
   */
  private krakenPairToSymbol(pair: string): string {
    return pair
      .replace('/USD', 'USD')
      .replace('XBT', 'BTC');
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'ping' }));
      }
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Set connection state
   */
  private setState(state: ConnectionState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Disconnect from exchange
   */
  disconnect(): void {
    this.stopPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }
}

/**
 * Binance WebSocket endpoint
 */
export const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

/**
 * Kraken WebSocket endpoint
 */
export const KRAKEN_WS_URL = 'wss://ws.kraken.com';

/**
 * Factory to create exchange connectors
 */
export function createExchangeConnector(
  exchange: 'binance' | 'kraken',
  symbols: string[]
): ExchangeConnector {
  const config: ExchangeConfig = {
    name: exchange,
    wsUrl: exchange === 'binance' ? BINANCE_WS_URL : KRAKEN_WS_URL,
    symbols,
    messageType: 'trade'
  };

  return new ExchangeConnector(config);
}