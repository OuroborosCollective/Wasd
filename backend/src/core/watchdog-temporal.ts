import { WatchdogEmitter } from './watchdog-emitter.js';
import { TemporalAnomaly } from '../../../server/src/modules/brain/TemporalAnomalyBrain.js';

export class WatchdogTemporalMonitor {
  private emitter: WatchdogEmitter;

  constructor(emitterUrl: string = 'ws://localhost:9090') {
      this.emitter = new WatchdogEmitter(emitterUrl);
  }

  public evaluateAnomalies(anomalies: TemporalAnomaly[]) {
      for (const anomaly of anomalies) {
          if (anomaly.intensity > 0.8 || anomaly.activeEchos > 10) {
              this.emitter.emit(
                  'TEMPORAL_DESYNC_CRITICAL',
                  {
                      message: `Critical time dilation at ${anomaly.center.x}, ${anomaly.center.y}, ${anomaly.center.z}. Reality echoes destabilizing.`,
                      anomaly
                  },
                  'CRITICAL',
                  'TEMPORAL_WATCHDOG'
              );

              if (anomaly.intensity > 0.95) {
                this.emitter.triggerInstabilityAlert('Severe Temporal Collapse Imminent', { anomalyId: anomaly.id });
              }
          } else if (anomaly.intensity > 0.6) {
              this.emitter.emit(
                  'TEMPORAL_SHIFT_WARNING',
                  {
                      message: `Temporal shift detected. Player actions may echo.`,
                      anomaly
                  },
                  'MEDIUM',
                  'TEMPORAL_WATCHDOG'
              );
          }
      }
  }
}
