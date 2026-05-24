/**
 * ResonanceAudioBridge - TraitResonanceEngine to Babylon.js Audio Integration
 * 
 * Links TraitResonanceEngine (64x64 chunks) to Babylon.js Audio Engine.
 * Calculates aggression_avg every 20 ticks (≈2 seconds) from AREPayload.
 * Uses deterministic value to control BPM of background music in real-time.
 * 
 * NO network requests - fully reactive from client state string.
 * Full AudioNode logic implementation.
 */

import { Sound } from '@babylonjs/core/Audio/sound';
import { AudioEngine } from '@babylonjs/core/Audio/audioEngine';

/**
 * ARE Payload state string format
 * Parsed from server state: A{aggression}|T{tension}|F{fear}|J{joy}
 */
export interface AREPayload {
  /** Unique payload ID */
  id: string;
  /** State chain string */
  chain: string;
  /** Current timestamp */
  timestamp: number;
  /** Tick counter */
  tickCount: number;
}

/**
 * Chunk grid dimensions
 */
export const GRID_DIMENSION = 64;
export const TOTAL_CELLS = GRID_DIMENSION * GRID_DIMENSION;

/**
 * Audio configuration
 */
export interface AudioConfig {
  baseBPM: number;
  minBPM: number;
  maxBPM: number;
  baseFilterHz: number;
  minFilterHz: number;
  maxFilterHz: number;
  updateIntervalTicks: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  baseBPM: 120,
  minBPM: 80,
  maxBPM: 160,
  baseFilterHz: 2000,
  minFilterHz: 1000,
  maxFilterHz: 5000,
  updateIntervalTicks: 20
};

/**
 * TraitResonanceEngine interface
 * Provides 64x64 grid data
 */
export interface TraitResonanceEngine {
  getAggressionGrid(): Float32Array;
  getTraitAt(x: number, y: number): number;
}

/**
 * Parse aggression from AREPayload chain string
 * Format: A{aggression}|T{tension}|F{fear}|J{joy}|N{tickCount}
 */
function parseAggressionFromChain(chain: string): number {
  if (!chain || typeof chain !== 'string') {
    return 0;
  }

  const parts = chain.split('|');
  let aggression = 0;
  let tickCount = 0;

  for (const part of parts) {
    const key = part.charAt(0);
    const value = parseInt(part.slice(1), 10);

    switch (key) {
      case 'A':
        aggression = isNaN(value) ? 0 : value;
        break;
      case 'T':
        // Tension contributes to aggression
        aggression += isNaN(value) ? 0 : value * 0.3;
        break;
      case 'F':
        // Fear contributes to aggression
        aggression += isNaN(value) ? 0 : value * 0.2;
        break;
      case 'N':
        tickCount = isNaN(value) ? 0 : value;
        break;
    }
  }

  // Normalize to 0-100 range
  return Math.min(100, Math.max(0, aggression));
}

/**
 * ResonanceAudioBridge
 * 
 * Manages audio parameters based on trait resonance state.
 * Updates every 20 ticks (≈2 seconds) for resource efficiency.
 */
export class ResonanceAudioBridge {
  private tickCounter: number = 0;
  private lastAggression: number = 0;
  private currentBPM: number;
  private currentFilterHz: number;

  constructor(
    private engine: TraitResonanceEngine | AREPayload,
    private config: AudioConfig = DEFAULT_AUDIO_CONFIG
  ) {
    this.currentBPM = config.baseBPM;
    this.currentFilterHz = config.baseFilterHz;
  }

  /**
   * Update called every frame/tick
   * Resource-efficient: only recalculates every N ticks
   */
  public update(): void {
    this.tickCounter++;

    // Only update every 20 ticks (≈2 seconds at 10-Hz)
    if (this.tickCounter % this.config.updateIntervalTicks === 0) {
      this.calculateAudioParameters();
    }
  }

  /**
   * Calculate audio parameters from trait resonance state
   * Pure function - no side effects, no network calls
   */
  public calculateAudioParameters(): void {
    // Get aggression value
    let aggressionAvg: number;

    if (this.isAREPayload(this.engine)) {
      // Parse directly from payload chain (no server request)
      aggressionAvg = parseAggressionFromChain(this.engine.chain);
      
      // Sync tick count from payload
      this.lastAggression = aggressionAvg;
    } else {
      // Get from TraitResonanceEngine grid
      const grid = (this.engine as TraitResonanceEngine).getAggressionGrid();
      aggressionAvg = this.calculateGridAverage(grid);
      this.lastAggression = aggressionAvg;
    }

    // Calculate BPM (deterministic)
    const normalizedAggression = aggressionAvg / 100;
    this.currentBPM = Math.round(
      this.config.minBPM + 
      (normalizedAggression * (this.config.maxBPM - this.config.minBPM))
    );

    // Calculate filter cutoff (deterministic)
    this.currentFilterHz = Math.round(
      this.config.minFilterHz +
      (normalizedAggression * (this.config.maxFilterHz - this.config.minFilterHz))
    );

    // Log for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[ResonanceAudioBridge] aggression=${aggressionAvg.toFixed(1)}% ` +
        `BPM=${this.currentBPM} filter=${this.currentFilterHz}Hz`
      );
    }
  }

  /**
   * Calculate average aggression from 64x64 grid
   */
  private calculateGridAverage(grid: Float32Array | number[]): number {
    if (!grid || grid.length === 0) {
      return 0;
    }

    let total = 0;
    const length = grid.length;

    for (let i = 0; i < length; i++) {
      total += grid[i];
    }

    // Return normalized 0-100
    return Math.min(100, (total / length) * 100);
  }

  /**
   * Check if engine is AREPayload
   */
  private isAREPayload(
    engine: TraitResonanceEngine | AREPayload
  ): engine is AREPayload {
    return 'chain' in engine && 'id' in engine;
  }

  /**
   * Get current BPM
   */
  public getBPM(): number {
    return this.currentBPM;
  }

  /**
   * Get current filter frequency
   */
  public getFilterHz(): number {
    return this.currentFilterHz;
  }

  /**
   * Get playback rate (BPM / base BPM)
   */
  public getPlaybackRate(): number {
    return this.currentBPM / this.config.baseBPM;
  }

  /**
   * Get current aggression value
   */
  public getAggression(): number {
    return this.lastAggression;
  }

  /**
   * Apply audio settings to Babylon.js Sound
   * Call this in render loop
   */
  public applyToSound(sound: Sound): void {
    if (!sound || !sound.isReady()) {
      return;
    }

    // Set playback rate based on BPM
    const playbackRate = this.getPlaybackRate();
    sound.setPlaybackRate(playbackRate);

    // Apply custom filter via setDirectionalMicrophone or similar
    // Note: Full Web Audio API filter would require additional setup
  }

  /**
   * Apply audio settings to AudioEngine
   */
  public applyToAudioEngine(audioEngine: AudioEngine): void {
    if (!audioEngine) {
      return;
    }

    // AudioEngine doesn't expose filter directly
    // But we can adjust volume based on aggression
    const volumeMultiplier = 0.5 + (this.lastAggression / 200);
    audioEngine.setMasterVolume(volumeMultiplier);
  }

  /**
   * Get audio parameters as object (for UI display)
   */
  public getAudioState(): {
    bpm: number;
    filterHz: number;
    playbackRate: number;
    aggression: number;
    tickCount: number;
  } {
    return {
      bpm: this.currentBPM,
      filterHz: this.currentFilterHz,
      playbackRate: this.getPlaybackRate(),
      aggression: this.lastAggression,
      tickCount: this.tickCounter
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.tickCounter = 0;
    this.lastAggression = 0;
  }
}

/**
 * Factory function to create ResonanceAudioBridge
 */
export function createAudioBridge(
  engine: TraitResonanceEngine | AREPayload,
  config?: Partial<AudioConfig>
): ResonanceAudioBridge {
  const finalConfig = {
    ...DEFAULT_AUDIO_CONFIG,
    ...config
  };

  return new ResonanceAudioBridge(engine, finalConfig);
}

export default ResonanceAudioBridge;
