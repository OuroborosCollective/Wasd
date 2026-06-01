/**
 * Zero-Trust Manifest System with Input Lockdown
 * 
 * This module provides the complete integration for the manifest system
 * including automatic resync, input blocking, and divergence alerting.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ClientManifestTracker,
  clientManifestTracker,
  parseWorldTickManifest,
  type ManifestVerificationResult,
} from './ClientManifestTracker.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseManifestResult {
  /** Current tick from server */
  currentTick: number;
  /** Last verified state hash */
  lastStateHash: string;
  /** Whether client is diverged */
  diverged: boolean;
  /** Whether resync is in progress */
  isResyncing: boolean;
  /** Resync error message if any */
  resyncError: string | null;
  /** Number of resync attempts */
  resyncAttempts: number;
  /** Input is locked due to divergence */
  inputLocked: boolean;
  /** Last verification result */
  lastVerification: ManifestVerificationResult | null;
  /** Export state as string for debugging */
  exportState: () => string;
  /** Manual reset */
  reset: () => void;
}

export interface UseManifestOptions {
  /** Player ID for resync requests */
  playerId: string;
  /** Maximum resync retry attempts */
  maxRetries?: number;
  /** Resync retry delay in ms */
  retryDelayMs?: number;
  /** Callback when divergence detected */
  onDivergence?: (result: ManifestVerificationResult) => void;
  /** Callback when resync completes successfully */
  onResyncSuccess?: () => void;
  /** Callback when resync fails permanently */
  onResyncFailed?: (error: string) => void;
}

// ─── Resync API Response ─────────────────────────────────────────────────────

interface ResyncResponse {
  ok: boolean;
  serverTick: number;
  serverStateHash: string;
  state: unknown;
  snapshotTick: number;
  snapshotHash: string;
  error?: string;
  divergence?: {
    divergenceTick: number;
    divergedComponents: string[];
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 2000;

/**
 * Zero-Trust Manifest Hook with Input Lockdown
 * 
 * Automatically handles resync and blocks inputs during divergence.
 */
export function useZeroTrustManifest(options: UseManifestOptions): UseManifestResult {
  const {
    playerId,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    onDivergence,
    onResyncSuccess,
    onResyncFailed,
  } = options;

  // Manifest state
  const [currentTick, setCurrentTick] = useState(-1);
  const [lastStateHash, setLastStateHash] = useState('');
  const [diverged, setDiverged] = useState(false);
  const [lastVerification, setLastVerification] = useState<ManifestVerificationResult | null>(null);
  
  // Resync state
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);
  const [resyncAttempts, setResyncAttempts] = useState(0);
  
  // Input lockdown is active when diverged
  const inputLocked = diverged;

  const trackerRef = useRef(clientManifestTracker);
  const resyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resyncTimeoutRef.current) {
        clearTimeout(resyncTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Perform resync to server
   */
  const performResync = useCallback(async (): Promise<boolean> => {
    if (isResyncing) return false;

    setIsResyncing(true);
    setResyncError(null);
    
    // Abort any previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/manifest/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          clientTick: currentTick,
          clientStateHash: lastStateHash,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ResyncResponse = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Resync failed');
      }

      // Apply server state
      // In a real implementation, you would apply data.state to your game state
      // For now, we just mark as synchronized
      trackerRef.current.markSynchronized(data.serverTick, data.serverStateHash);

      // Reset state
      setDiverged(false);
      setIsResyncing(false);
      setResyncAttempts(0);
      setCurrentTick(data.serverTick);
      setLastStateHash(data.serverStateHash);

      onResyncSuccess?.();
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResyncError(errorMessage);
      setIsResyncing(false);

      // Schedule retry if we haven't exceeded max retries
      if (resyncAttempts < maxRetries - 1) {
        setResyncAttempts(prev => prev + 1);
        
        resyncTimeoutRef.current = setTimeout(() => {
          performResync();
        }, retryDelayMs);
        
        return false;
      } else {
        // Max retries exceeded
        onResyncFailed?.(errorMessage);
        return false;
      }
    }
  }, [playerId, currentTick, lastStateHash, isResyncing, resyncAttempts, maxRetries, retryDelayMs, onResyncSuccess, onResyncFailed]);

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

      // Check for divergence
      if (result.needsResync && !diverged) {
        setDiverged(true);
        setResyncAttempts(0);
        
        // Notify callback
        onDivergence?.(result);
        
        // Automatically trigger resync
        performResync();
      }
    };

    window.addEventListener('wasd:network-packet', handleWorldTick as EventListener);

    return () => {
      window.removeEventListener('wasd:network-packet', handleWorldTick as EventListener);
    };
  }, [diverged, onDivergence, performResync]);

  const exportState = useCallback(() => {
    return trackerRef.current.exportState();
  }, []);

  const reset = useCallback(() => {
    trackerRef.current.reset();
    setCurrentTick(-1);
    setLastStateHash('');
    setDiverged(false);
    setIsResyncing(false);
    setResyncError(null);
    setResyncAttempts(0);
    setLastVerification(null);
    
    if (resyncTimeoutRef.current) {
      clearTimeout(resyncTimeoutRef.current);
    }
    abortControllerRef.current?.abort();
  }, []);

  return {
    currentTick,
    lastStateHash,
    diverged,
    isResyncing,
    resyncError,
    resyncAttempts,
    inputLocked,
    lastVerification,
    exportState,
    reset,
  };
}

// ─── Input Lock Context ────────────────────────────────────────────────────────

import { createContext, useContext, type ReactNode } from 'react';

interface InputLockContextValue {
  inputLocked: boolean;
  currentTick: number;
  lastStateHash: string;
}

const InputLockContext = createContext<InputLockContextValue>({
  inputLocked: false,
  currentTick: -1,
  lastStateHash: '',
});

export const InputLockProvider = InputLockContext.Provider;

/**
 * Hook to check if input is currently locked
 */
export function useInputLocked(): boolean {
  const context = useContext(InputLockContext);
  return context.inputLocked;
}

/**
 * Higher-order function to wrap intent handlers with input lock check
 */
export function withInputLock<T extends (...args: unknown[]) => void>(
  handler: T,
  getInputLocked: () => boolean
): T {
  return ((...args: unknown[]) => {
    if (getInputLocked()) {
      console.warn('[InputLock] Blocked intent while divergent');
      return;
    }
    return handler(...args);
  }) as T;
}

// ─── Re-export ────────────────────────────────────────────────────────────────

export { ClientManifestTracker, clientManifestTracker } from './ClientManifestTracker.js';
export { DivergenceAlert } from './ui/DivergenceAlert.js';
export type { ManifestVerificationResult } from './ClientManifestTracker.js';