import { SentientAxiomWatchdog } from '../../core/watchdogs/SentientAxiomWatchdog';

export class SentientAxiomBrain {
  private watchdog: SentientAxiomWatchdog;
  private manifestationThreshold: number = 100.0;

  constructor(watchdog: SentientAxiomWatchdog) {
    this.watchdog = watchdog;
  }

  public processManifestations(tick: number): Array<{ region: string, type: string }> {
    const states = this.watchdog.dumpState();
    const manifestations: Array<{ region: string, type: string }> = [];

    // States are already deterministically sorted by watchdog
    for (const state of states) {
      if (state.pressure >= this.manifestationThreshold) {
        // Deterministically select manifestation type based on tick and pressure
        const typeIndex = Math.floor(state.pressure + tick) % 3;
        const types = ['SentientRoots', 'PsycheStorm', 'AxiomAnamoly'];
        manifestations.push({
          region: state.region,
          type: types[typeIndex]
        });
      }
    }

    return manifestations;
  }
}
