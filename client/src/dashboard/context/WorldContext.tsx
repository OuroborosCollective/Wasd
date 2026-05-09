/**
 * @file client/src/dashboard/context/WorldContext.tsx
 * @description React Context for Arelorian World State
 * With Exponential Backoff and Binary Payload Support
 */

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface RegionState {
  id: string;
  energy: number;
  stability: string;
  corruption: number;
}

interface WorldState {
  tick: number;
  tickRate: number;
  regions: RegionState[];
}

interface EvolutionEvent {
  regionId: string;
  previousPhase: string;
  newPhase: string;
  tick: number;
}

interface WorldContextType {
  worldState: WorldState | null;
  connected: boolean;
  events: EvolutionEvent[];
  lastUpdate: Date | null;
  reconnectAttempt: number;
  latency: number;
}

// Exponential Backoff configuration
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

const WorldContext = createContext<WorldContextType>({
  worldState: null,
  connected: false,
  events: [],
  lastUpdate: null,
  reconnectAttempt: 0,
  latency: 0,
});

export function WorldProvider({ children }: { children: ReactNode }) {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<EvolutionEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [latency, setLatency] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Calculate exponential backoff delay
  const getBackoffDelay = (attempt: number): number => {
    const delay = BASE_DELAY * Math.pow(2, attempt);
    return Math.min(delay, MAX_DELAY);
  };

  // Decode binary payload (simple implementation)
  const decodeBinaryPayload = (buffer: ArrayBuffer): WorldState => {
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(buffer);
    return JSON.parse(jsonStr);
  };

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    let currentAttempt = 0;
    
    const connect = () => {
      if (process.env.DEV) console.log(`[ws] Connecting (attempt ${currentAttempt + 1})...`);
      
      const socket: Socket = io(API_URL, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
        withCredentials: true,
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        if (process.env.DEV) console.log('[ws] Connected to API');
        setConnected(true);
        setReconnectAttempt(0);
        currentAttempt = 0;
        
        // Ping for latency
        pingIntervalRef.current = window.setInterval(() => {
          const start = Date.now();
          socket.emit('ping', () => {
            setLatency(Date.now() - start);
          });
        }, 5000);
      });

      socket.on('disconnect', () => {
        if (process.env.DEV) console.log('[ws] Disconnected');
        setConnected(false);
        
        if (currentAttempt < MAX_RECONNECT_ATTEMPTS) {
          const delay = getBackoffDelay(currentAttempt);
          if (process.env.DEV) console.log(`[ws] Reconnecting in ${delay}ms...`);
          currentAttempt++;
          setReconnectAttempt(currentAttempt);
          setTimeout(connect, delay);
        }
      });

      socket.on('connect_error', (error) => {
        if (process.env.DEV) console.error('[ws] Connection error:', error);
        
        if (currentAttempt < MAX_RECONNECT_ATTEMPTS) {
          const delay = getBackoffDelay(currentAttempt);
          if (process.env.DEV) console.log(`[ws] Retry in ${delay}ms...`);
          currentAttempt++;
          setReconnectAttempt(currentAttempt);
          setTimeout(connect, delay);
        }
      });

      // Binary payload support
      socket.on('WORLD_HEARTBEAT_BINARY', (buffer: ArrayBuffer) => {
        try {
          const state = decodeBinaryPayload(buffer);
          setWorldState(state);
          setLastUpdate(new Date());
        } catch (e) {
          if (process.env.DEV) console.error('[ws] Binary decode error:', e);
        }
      });

      socket.on('WORLD_STATE', (state: WorldState) => {
        setWorldState(state);
        setLastUpdate(new Date());
      });

      socket.on('WORLD_HEARTBEAT', (state: WorldState) => {
        setWorldState(state);
        setLastUpdate(new Date());
      });

      socket.on('EVOLUTION_EVENT', (event: EvolutionEvent) => {
        if (process.env.DEV) console.log('[event] Evolution:', event);
        setEvents(prev => [{ ...event, tick: Number(event.tick) }, ...prev].slice(0, 50));
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('evolution-alert', { detail: event }));
        }
      });
    };

    connect();

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <WorldContext.Provider value={{ worldState, connected, events, lastUpdate, reconnectAttempt, latency }}>
      {children}
    </WorldContext.Provider>
  );
}

export function useWorld() {
  return useContext(WorldContext);
}