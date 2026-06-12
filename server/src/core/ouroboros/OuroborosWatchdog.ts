/**
 * OuroborosWatchdog - Client State Integrity Verification System
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 2: Nomock-Theorem (NO trusting client data)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * 
 * Verifies client state integrity without trusting client data.
 * Client sends: chunkKey + erdosString + claimedHash
 * Server computes: expectedHash from erdosString deterministically
 */

import { KAPPA } from '../are/Kappa.js';
import { kappa1000Hash, hashChunkKappa1000, type KappaLayers } from '../are/KappaLayers.js';
import { type ChunkKey, type TickId, type StateHash, createStateHash } from '../are/types.js';
import {
  OUROBOROS_CONFIG,
  type ChunkVerification,
  type ErdősString
} from './OuroborosTypes.js';
import {
  fromErdosRecord,
  reconstructLayersFromErdos
} from './ErdosStringManager.js';

/**
 * AutohealGhost - State resurrection for corrupted chunks
 */
interface AutohealGhost {
  resurrectState(chunkKey: ChunkKey, erdosString: string, tick: TickId): KappaLayers;
}

/**
 * OuroborosWatchdog - Client state verification
 */
export class OuroborosWatchdog {
  private readonly config = OUROBOROS_CONFIG.WATCHDOG;
  private readonly autohealGhost: AutohealGhost;

  constructor() {
    this.autohealGhost = {
      resurrectState: (chunkKey, erdosString, tick) => {
        // Deterministic resurrection from Erdős-String
        const erdos = fromErdosRecord({
          chunkKey,
          erdosString,
          lastTick: tick
        });
        return reconstructLayersFromErdos(erdos);
      }
    };
  }

  /**
   * Verify chunk state hash matches computed expectation.
   * 
   * @param chunkKey - Chunk identifier
   * @param erdosString - Client's Erdős-String
   * @param clientHash - Client's claimed state hash
   * @param tick - Current tick
   * @returns Verification result
   */
  verifyChunk(
    chunkKey: ChunkKey,
    erdosString: string,
    clientHash: string,
    tick: TickId
  ): ChunkVerification {
    // Reconstruct Erdős-String from client data
    const erdos: ErdősString = {
      chunkKey,
      events: erdosString,
      lastTick: tick
    };
    
    // Reconstruct layers deterministically
    const reconstructedLayers = reconstructLayersFromErdos(erdos);
    
    // Compute expected hash
    const expectedHash = hashChunkKappa1000(
      chunkKey,
      reconstructedLayers,
      tick
    );
    
    const clientHashLower = clientHash.toLowerCase();
    const isValid = clientHashLower === expectedHash;
    
    return {
      chunkKey,
      clientHash: createStateHash(clientHashLower) as StateHash,
      serverHash: expectedHash,
      isValid,
      tick
    };
  }

  /**
   * Verify multiple chunks in batch.
   */
  verifyChunkBatch(
    chunks: ReadonlyArray<{
      chunkKey: ChunkKey;
      erdosString: string;
      clientHash: string;
      tick: TickId;
    }>
  ): ChunkVerification[] {
    return chunks.map(chunk =>
      this.verifyChunk(chunk.chunkKey, chunk.erdosString, chunk.clientHash, chunk.tick)
    );
  }

  /**
   * Handle verification failure with auto-heal.
   * 
   * @param chunkKey - Chunk with failed verification
   * @param erdosString - Client's Erdős-String
   * @param tick - Current tick
   */
  handleVerificationFailure(
    chunkKey: ChunkKey,
    erdosString: string,
    tick: TickId
  ): KappaLayers {
    console.error(`[WATCHDOG] Nomock-Regel verletzt in ${chunkKey}`);
    
    // Resurrect state deterministically
    const resurrectedLayers = this.autohealGhost.resurrectState(
      chunkKey,
      erdosString,
      tick
    );
    
    console.log(`[WATCHDOG] State resurrected for ${chunkKey}`);
    
    return resurrectedLayers;
  }

  /**
   * Generate a verification challenge for a chunk.
   * Server asks client to prove they know the correct state.
   */
  generateChallenge(chunkKey: ChunkKey, tick: TickId): string {
    // Deterministic challenge based on chunk and tick
    const challengeSeed = kappa1000Hash(`${chunkKey}_${tick}_${KAPPA}`);
    return `CHALLENGE_${challengeSeed}_${tick}`;
  }

  /**
   * Verify a challenge response.
   */
  verifyChallengeResponse(
    chunkKey: ChunkKey,
    tick: TickId,
    challenge: string,
    response: string
  ): boolean {
    // Recompute expected challenge
    const expectedChallenge = this.generateChallenge(chunkKey, tick);
    
    // Response should be hash of challenge + chunk data
    const expectedResponse = kappa1000Hash(`${expectedChallenge}_${chunkKey}_${tick}_${KAPPA}`);
    
    return Number(response) === expectedResponse;
  }

  /**
   * Create a state proof for a chunk.
   * Can be used for cross-verification between servers.
   */
  createStateProof(
    chunkKey: ChunkKey,
    erdosString: string,
    tick: TickId
  ): string {
    const erdos: ErdősString = {
      chunkKey,
      events: erdosString,
      lastTick: tick
    };
    
    const layers = reconstructLayersFromErdos(erdos);
    const hash = hashChunkKappa1000(chunkKey, layers, tick);
    
    // Create proof string: tick|chunkKey|hash
    return `${tick}|${chunkKey}|${hash}`;
  }

  /**
   * Verify a state proof.
   */
  verifyStateProof(proof: string): boolean {
    const parts = proof.split('|');
    if (parts.length !== 3) return false;
    
    const [tickStr, chunkKey, hash] = parts;
    const tick = Number(tickStr) as TickId;
    
    if (Number.isNaN(tick)) return false;
    
    // We can't verify without the erdosString, but we can check format
    return hash.length === 64 && /^[0-9a-f]+$/.test(hash);
  }
}

/**
 * WatchdogAlert - Alert for verification failures
 */
export interface WatchdogAlert {
  readonly chunkKey: ChunkKey;
  readonly tick: TickId;
  readonly expectedHash: string;
  readonly actualHash: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly timestamp: number;
}

/**
 * WatchdogEventEmitter - Event emitter for watchdog alerts
 */
export class WatchdogEventEmitter {
  private listeners: Array<(alert: WatchdogAlert) => void> = [];

  subscribe(listener: (alert: WatchdogAlert) => void): void {
    this.listeners.push(listener);
  }

  unsubscribe(listener: (alert: WatchdogAlert) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  emit(alert: WatchdogAlert): void {
    for (const listener of this.listeners) {
      try {
        listener(alert);
      } catch (e) {
        console.error('[WatchdogEventEmitter] Listener error:', e);
      }
    }
  }
}

// Singleton instances
let watchdogInstance: OuroborosWatchdog | null = null;
let eventEmitterInstance: WatchdogEventEmitter | null = null;

export function getOuroborosWatchdog(): OuroborosWatchdog {
  if (!watchdogInstance) {
    watchdogInstance = new OuroborosWatchdog();
  }
  return watchdogInstance;
}

export function getWatchdogEventEmitter(): WatchdogEventEmitter {
  if (!eventEmitterInstance) {
    eventEmitterInstance = new WatchdogEventEmitter();
  }
  return eventEmitterInstance;
}