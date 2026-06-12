import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { WarfrontSystem } from '../../modules/warfront/WarfrontSystem.js';

export class WarfrontTickSystem implements TickSystem {
  readonly name = 'warfront';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;

  private warfrontSystem: WarfrontSystem;
  private tickMultiplier = 100;

  constructor(warfrontSystem: WarfrontSystem) {
    this.warfrontSystem = warfrontSystem;
  }

  tick(context: TickSystemContext): unknown {
    return this.warfrontSystem.tick(context.tickCount * this.tickMultiplier);
  }

  getWarfrontSystem(): WarfrontSystem {
    return this.warfrontSystem;
  }
}

export function registerWarfrontSystem(warfrontSystem: WarfrontSystem): WarfrontTickSystem {
  const system = new WarfrontTickSystem(warfrontSystem);

  tickSystemRegistry.register({
    system,
    dependencies: ['player-system', 'npc-system'],
    tags: ['warfront', 'gameplay'],
  });

  return system;
}
