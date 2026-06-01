/**
 * Manifest Integration Hooks
 * 
 * React hooks and utilities for integrating manifest verification
 * into existing client components like WorldHeartMonitor.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClientManifestTracker,
  clientManifestTracker,
  parseWorldTickManifest,
  type ManifestVerificationResult,
  type ClientManifestState,
} from './ClientManifestTracker.js';

export interface UseManifestResult {
  /** Current tick from server */
  currentTick: number;
  /** Last verified state hash */
  lastStateHash: string;
  /** Whether client is diverged */
  diverged: boolean;
  /** Last verification result */
  lastVerification: ManifestVerificationResult | null;
  /** All snapshot ticks known */
  snapshotTicks: number[];
  /** Export state as string for debugging */
  exportState: () => string;
  /** Manual reset */
  reset: () => void;
}

export interface UseManifestOptions {
  /** WebSocket URL to connect for manifest events */
  wsUrl?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when divergence detected */
  onDivergence?: (result: ManifestVerificationResult) => void;
  /** Callback when resync recommended */
  onResyncNeeded?: (result: ManifestVerificationResult) => void;
}

/**
 * React hook for manifest state management.
 * Works with the existing WorldHeartMonitor integration.
 */
export function useManifest(options: UseManifestOptions = {}): UseManifestResult {
  const { onDivergence, onResyncNeeded } = options;
  
  const [currentTick, setCurrentTick] = useState(-1);
  const [lastStateHash, setLastStateHash] = useState('');
  const [diverged, setDiverged] = useState(false);
  const [lastVerification, setLastVerification] = useState<ManifestVerificationResult | null>(null);
  const [snapshotTicks, setSnapshotTicks] = useState<number[]>([]);
  
  const trackerRef = useRef(clientManifestTracker);

  // Listen for world tick events
  useEffect(() => {
    const handleWorldTick = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;
      
      // Parse manifest info from world_tick
      const parsed = parseWorldTickManifest(detail);
      if (!parsed) return;
      
      // Process with tracker
      const result = trackerRef.current.processManifest(detail);
      
      // Update state
      setCurrentTick(result.tick);
      setLastStateHash(result.stateHash);
      setLastVerification(result);
      setDiverged(result.needsResync);
      
      // Record snapshot if this is a snapshot tick
      if (detail.manifest?.snapshotTick > 0) {
        const ticks = [...snapshotTicks];
        if (!ticks.includes(detail.manifest.snapshotTick)) {
          ticks.push(detail.manifest.snapshotTick);
          ticks.sort((a, b) => a - b);
          setSnapshotTicks(ticks);
        }
        trackerRef.current.recordSnapshot(detail.manifest.snapshotTick, result.stateHash);
      }
      
      // Callbacks
      if (result.needsResync) {
        onResyncNeeded?.(result);
        if (result.errors.length > 0) {
          onDivergence?.(result);
        }
      }
    };

    window.addEventListener('wasd:network-packet', handleWorldTick as EventListener);
    
    return () => {
      window.removeEventListener('wasd:network-packet', handleWorldTick as EventListener);
    };
  }, [onDivergence, onResyncNeeded]);

  const exportState = useCallback(() => {
    return trackerRef.current.exportState();
  }, []);

  const reset = useCallback(() => {
    trackerRef.current.reset();
    setCurrentTick(-1);
    setLastStateHash('');
    setDiverged(false);
    setLastVerification(null);
    setSnapshotTicks([]);
  }, []);

  return {
    currentTick,
    lastStateHash,
    diverged,
    lastVerification,
    snapshotTicks,
    exportState,
    reset,
  };
}

/**
 * Get the global manifest tracker instance.
 */
export function useManifestTracker(): ClientManifestTracker {
  return clientManifestTracker;
}

/**
 * Hook for manual manifest processing.
 * Use this when you have raw tick data from WebSocket.
 */
export function useManifestProcessor(
  onVerification: (result: ManifestVerificationResult) => void
): (data: Record<string, unknown>) => void {
  const trackerRef = useRef(clientManifestTracker);
  
  return useCallback((data: Record<string, unknown>) => {
    const result = trackerRef.current.processManifest(data);
    onVerification(result);
  }, [onVerification]);
}

// ─── Divergence Alert Component ────────────────────────────────────────────────

export interface DivergenceAlertProps {
  /** Manifest state to display */
  manifestState: UseManifestResult;
  /** Callback to request resync */
  onRequestResync?: () => void;
}

/**
 * Simple divergence status display component.
 * Can be integrated into existing HUD or debug panel.
 */
export function ManifestStatusBadge({ 
  currentTick, 
  diverged, 
  lastStateHash 
}: { 
  currentTick: number; 
  diverged: boolean; 
  lastStateHash: string; 
}) {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 4, 
      right: 4, 
      padding: '4px 8px',
      background: diverged ? '#ff3300' : '#00ff99',
      color: '#000',
      fontSize: 10,
      fontFamily: 'monospace',
      borderRadius: 4,
      zIndex: 1000,
    }}>
      {diverged ? '⚠ DIVERGED' : '✓ SYNCED'} | T:{currentTick}
    </div>
  );
}

// ─── Resync Request Helper ────────────────────────────────────────────────────

export interface ResyncRequest {
  clientTick: number;
  clientStateHash: string;
  nearestSnapshotTick: number | null;
}

export function createResyncRequest(tracker: ClientManifestTracker): ResyncRequest {
  const state = tracker.getState();
  const nearest = tracker.getNearestSnapshot(state.currentTick);
  
  return {
    clientTick: state.currentTick,
    clientStateHash: state.lastStateHash,
    nearestSnapshotTick: nearest?.tick ?? null,
  };
}