import { WatchdogEmitter } from './watchdog-emitter.js';
import { ResonanceCascade } from '../../../server/src/modules/brain/AetherManifestationBrain.js';

export class WatchdogAetherMonitor {
  private emitter: WatchdogEmitter;

  constructor(emitterUrl: string = 'ws://localhost:9090') {
      this.emitter = new WatchdogEmitter(emitterUrl);
  }

  public monitorCascades(cascades: ResonanceCascade[]) {
      for (const cascade of cascades) {
          if (cascade.magnitude > 100 || cascade.linkedNodesCount > 5) {
              this.emitter.emit(
                  'AETHER_CASCADE_CRITICAL',
                  {
                      message: `Explosive aether resonance cascade imminent at ${cascade.epicenter.x}, ${cascade.epicenter.y}, ${cascade.epicenter.z}.`,
                      cascade
                  },
                  'CRITICAL',
                  'AETHER_WATCHDOG'
              );

              if (cascade.magnitude > 200) {
                 this.emitter.triggerInstabilityAlert('Catastrophic Aether Detonation', { cascadeId: cascade.id });
              }
          } else if (cascade.magnitude > 50) {
              this.emitter.emit(
                  'AETHER_BUILDUP_WARNING',
                  {
                      message: `Aether volatility rising. Harmonic links strengthening.`,
                      cascade
                  },
                  'HIGH',
                  'AETHER_WATCHDOG'
              );
          }
      }
  }
}
