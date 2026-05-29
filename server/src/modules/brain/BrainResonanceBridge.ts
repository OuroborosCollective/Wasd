import { AREShadowGateAdapter, ShadowEcho } from '../../core/are/AREShadowGateAdapter';
import { HeuristicWorldBrain } from './HeuristicWorldBrain';

export class BrainResonanceBridge {
  private static instance: BrainResonanceBridge;

  constructor(private worldBrain: HeuristicWorldBrain) {
    AREShadowGateAdapter.subscribe((echo) => this.handleEcho(echo));
  }

  static initialize(worldBrain: HeuristicWorldBrain): BrainResonanceBridge {
    if (!this.instance) {
      this.instance = new BrainResonanceBridge(worldBrain);
    }
    return this.instance;
  }

  private handleEcho(echo: ShadowEcho): void {
    const fluxBoost = echo.intensity * 0.2;
    const currentFlux = this.worldBrain.getNodeValue('magic_flux');
    this.worldBrain.updateNode('magic_flux', Math.min(1.0, currentFlux + fluxBoost));

    const currentTension = this.worldBrain.getNodeValue('social_tension');
    this.worldBrain.updateNode('social_tension', Math.min(1.0, currentTension + (fluxBoost * 0.5)));
  }
}
