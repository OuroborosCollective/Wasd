import { WatchdogEmitter } from './watchdog-emitter.js';
import { FactionEvolutionEvent } from '../../../server/src/modules/brain/SymbioticEvolutionBrain.js';

export class WatchdogSymbioteMonitor {
  private emitter: WatchdogEmitter;

  constructor(emitterUrl: string = 'ws://localhost:9090') {
      this.emitter = new WatchdogEmitter(emitterUrl);
  }

  public monitorEvolution(events: FactionEvolutionEvent[]) {
      for (const event of events) {
          if (event.eventType === 'COLLAPSE' && event.magnitude > 0.5) {
              this.emitter.emit(
                  'FACTION_COLLAPSE_CRITICAL',
                  {
                      message: `Catastrophic territorial collapse for faction ${event.factionId} near ${event.centerPoint.x}, ${event.centerPoint.y}, ${event.centerPoint.z}.`,
                      event
                  },
                  'CRITICAL',
                  'SYMBIOTE_WATCHDOG'
              );

              if (event.magnitude > 0.8) {
                this.emitter.triggerInstabilityAlert('Hostile Faction Overrun Imminent', { eventId: event.factionId });
              }
          } else if (event.eventType === 'EXPANSION') {
              this.emitter.emit(
                  'FACTION_EXPANSION_NOTICE',
                  {
                      message: `Rapid territory expansion by faction ${event.factionId}. Rebalancing ecosystem.`,
                      event
                  },
                  'MEDIUM',
                  'SYMBIOTE_WATCHDOG'
              );
          } else if (event.eventType === 'SYMBIOSIS') {
              this.emitter.emit(
                  'FACTION_SYMBIOSIS_WARNING',
                  {
                      message: `Symbiotic mutation occurring in faction ${event.factionId} due to border tension.`,
                      event
                  },
                  'HIGH',
                  'SYMBIOTE_WATCHDOG'
              );
          }
      }
  }
}
