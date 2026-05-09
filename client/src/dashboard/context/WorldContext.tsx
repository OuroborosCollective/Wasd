/**
 * @file client/src/dashboard/context/WorldContext.tsx
 * @description React Context for Arelorian World State
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const WorldContext = createContext<WorldContextType>({
  worldState: null,
  connected: false,
  events: [],
  lastUpdate: null,
});

export function WorldProvider({ children }: { children: ReactNode }) {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<EvolutionEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    const socket: Socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[ws] Connected to API');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[ws] Disconnected');
      setConnected(false);
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
      console.log('[event] Evolution:', event);
      setEvents(prev => [{ ...event, tick: Number(event.tick) }, ...prev].slice(0, 50));
      
      // Show toast notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('evolution-alert', { detail: event }));
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[ws] Connection error:', error);
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <WorldContext.Provider value={{ worldState, connected, events, lastUpdate }}>
      {children}
    </WorldContext.Provider>
  );
}

export function useWorld() {
  return useContext(WorldContext);
}