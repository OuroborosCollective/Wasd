import { SentientAxiomWatchdog } from '../../core/watchdogs/SentientAxiomWatchdog';
import { SentientAxiomBrain } from '../brain/SentientAxiomBrain';

export class SentientAxiomPlexity {
  private watchdog: SentientAxiomWatchdog;
  private brain: SentientAxiomBrain;

  // Mapping region to its neighboring regions
  private regionConnections: Map<string, string[]> = new Map();

  constructor(watchdog: SentientAxiomWatchdog, brain: SentientAxiomBrain) {
    this.watchdog = watchdog;
    this.brain = brain;
  }

  public registerConnection(regionA: string, regionB: string): void {
    const listA = this.regionConnections.get(regionA) || [];
    if (!listA.includes(regionB)) listA.push(regionB);
    this.regionConnections.set(regionA, listA.sort()); // Keep deterministic order

    const listB = this.regionConnections.get(regionB) || [];
    if (!listB.includes(regionA)) listB.push(regionA);
    this.regionConnections.set(regionB, listB.sort()); // Keep deterministic order
  }

  public processAxiomFlow(tick: number): void {
    const states = this.watchdog.dumpState();

    // Deterministic flow of pressure to connected regions
    for (const state of states) {
      if (state.pressure > 50) {
        const connections = this.regionConnections.get(state.region) || [];
        // Spread 10% of pressure to neighbors deterministically
        const spreadAmount = (state.pressure * 0.1) / (connections.length || 1);

        for (const neighbor of connections) {
          // Send back to watchdog
          this.watchdog.monitorInteractions(neighbor, spreadAmount, tick);
        }
      }
    }

    // After flow, process new manifestations
    this.brain.processManifestations(tick);
  }
}
