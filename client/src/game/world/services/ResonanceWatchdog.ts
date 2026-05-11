import { WatchdogService, WatchdogStats } from './WatchdogService.js';

/**
 * Ecosystem Resonance Engine - Watchdog Component
 *
 * Intercepts the 10Hz streaming loop. If local resonance is high AND the
 * device is struggling (detected via WatchdogStats like avgTickDuration),
 * it triggers a "Resonance Dampening Field" - logically restricting chunk
 * complexity and streaming distance to maintain playability.
 */
export class ResonanceWatchdog {
  private baseWatchdog: WatchdogService;
  private resonanceDampeningActive: boolean = false;

  // Thresholds
  private readonly TICK_DURATION_WARNING_MS = 80; // If a 100ms tick takes 80ms+, we are struggling
  private readonly CRITICAL_RESONANCE_THRESHOLD = 0.75;

  constructor(watchdogService: WatchdogService) {
    this.baseWatchdog = watchdogService;
  }

  /**
   * Evaluates if dampening should be applied based on current performance and world resonance.
   * This should be called periodically, ideally alongside the watchdog's own tick evaluation.
   *
   * @param stats Current watchdog performance stats
   * @param localResonance The player's current local Resonance value from the server
   */
  public evaluateDampening(stats: WatchdogStats, localResonance: number): void {
    if (!stats.running) return;

    const isStruggling = stats.avgTickDuration > this.TICK_DURATION_WARNING_MS;
    const isHighResonance = localResonance > this.CRITICAL_RESONANCE_THRESHOLD;

    if (isHighResonance && isStruggling) {
      this.activateDampening();
    } else if (!isHighResonance || stats.avgTickDuration < this.TICK_DURATION_WARNING_MS * 0.7) {
      // Deactivate if resonance drops, or if performance significantly recovers
      this.deactivateDampening();
    }
  }

  private activateDampening(): void {
    if (this.resonanceDampeningActive) return;
    this.resonanceDampeningActive = true;

    console.warn("[ResonanceWatchdog] High Resonance + Performance degradation detected. Activating Dampening Field.");

    // Logic: In a full implementation, we would inform the ChunkService to:
    // 1. Reduce load radius
    // 2. Ignore non-essential entities in new chunks
    // 3. Throttle load requests
  }

  private deactivateDampening(): void {
    if (!this.resonanceDampeningActive) return;
    this.resonanceDampeningActive = false;

    console.log("[ResonanceWatchdog] Stability restored. Deactivating Dampening Field.");

    // Logic: Restore normal chunk loading parameters
  }

  public isDampeningActive(): boolean {
    return this.resonanceDampeningActive;
  }
}
